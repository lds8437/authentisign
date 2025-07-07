import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import MAMMOTH from '@salesforce/resourceUrl/mammoth';
import PDFJS from '@salesforce/resourceUrl/pdfJS';
import PDFWORKER from '@salesforce/resourceUrl/pdfWorker';

export default class PdfTemplateEditor extends LightningElement {
    @api recordId;
    @track htmlOutput = '';
    @track selectedFileName;
    @track showIcon = true;
    @track activeTab = 'preview';
    @track showContent = false;
    @track mammothInitialized = false;
    @track pdfJsInitialized = false;

    get acceptedFormats() {
        return '.pdf,.docx';
    }

    async connectedCallback() {
        console.log('connectedCallback: Initializing Static Resources', { MAMMOTH, PDFJS, PDFWORKER });
        if (!this.mammothInitialized) {
            this.mammothInitialized = true;
            try {
                await loadScript(this, MAMMOTH);
                console.log('Mammoth.js loaded successfully, window.mammoth:', !!window.mammoth);
                if (!window.mammoth) {
                    throw new Error('Mammoth.js not initialized');
                }
            } catch (error) {
                console.error('Error loading Mammoth.js:', error);
                this.showToast('Error', 'Failed to load Mammoth.js library: ' + error.message, 'error');
            }
        }
        if (!this.pdfJsInitialized) {
            this.pdfJsInitialized = true;
            try {
                await loadScript(this, PDFJS);
                console.log('PDF.js loaded successfully, window.pdfjsLib:', !!window.pdfjsLib);
                if (!window.pdfjsLib) {
                    throw new Error('PDF.js not initialized');
                }
                await loadScript(this, PDFWORKER);
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWORKER;
                console.log('PDF worker loaded successfully');
            } catch (error) {
                console.error('Error loading PDF.js:', error);
                this.showToast('Error', 'Failed to load PDF.js library: ' + error.message, 'error');
            }
        }
    }

    async handleFileInputChange(event) {
        console.log('handleFileInputChange: File selected');
        const file = event.target.files[0];
        if (!file) {
            this.showToast('Error', 'No file selected', 'error');
            return;
        }
        this.selectedFileName = file.name;
        this.showContent = true;
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        console.log('File name:', file.name, 'Extracted file extension:', fileExtension);
        if (!['docx', 'pdf'].includes(fileExtension)) {
            this.showToast('Error', `Invalid file extension: ${fileExtension}`, 'error');
            this.htmlOutput = '';
            this.retryPreviewUpdate();
            return;
        }
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const fileContent = reader.result.split(',')[1];
                console.log('File content retrieved, size:', fileContent.length);
                await this.convertToHtml(fileContent, fileExtension);
                console.log('htmlOutput after conversion:', this.htmlOutput);
                this.activeTab = 'preview';
                this.retryPreviewUpdate();
            };
            reader.onerror = () => {
                console.error('Error reading file:', reader.error);
                this.showToast('Error', `Failed to read file: ${reader.error.message}`, 'error');
                this.htmlOutput = '';
                this.retryPreviewUpdate();
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error processing file:', error);
            this.showToast('Error', `Failed to process file: ${error.message}`, 'error');
            this.htmlOutput = '';
            this.retryPreviewUpdate();
        }
    }

    async convertToHtml(fileContent, fileExtension) {
        console.log('convertToHtml: Starting conversion for', fileExtension);
        console.log('Library availability:', { hasMammoth: !!window.mammoth, hasPdfjsLib: !!window.pdfjsLib });
        if (fileExtension === 'docx' && window.mammoth) {
            try {
                const result = await window.mammoth.convertToHtml({ arrayBuffer: this.base64ToArrayBuffer(fileContent) });
                this.htmlOutput = result.value || '<p>No content extracted from Word document</p>';
                console.log('Word document converted, htmlOutput:', this.htmlOutput);
            } catch (error) {
                console.error('Error converting Word document:', error);
                this.showToast('Error', `Failed to convert Word document: ${error.message}`, 'error');
                this.htmlOutput = '';
            }
        } else if (fileExtension === 'pdf' && window.pdfjsLib) {
            try {
                const pdf = await window.pdfjsLib.getDocument({ data: this.base64ToArrayBuffer(fileContent) }).promise;
                console.log('PDF loaded, pages:', pdf.numPages);
                let htmlContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    textContent.items.forEach(item => {
                        htmlContent += `<p>${item.str}</p>`;
                    });
                }
                this.htmlOutput = htmlContent || '<p>No content extracted from PDF</p>';
                console.log('PDF converted, htmlOutput:', this.htmlOutput);
            } catch (error) {
                console.error('Error converting PDF:', error);
                this.showToast('Error', `Failed to convert PDF: ${error.message}`, 'error');
                this.htmlOutput = '';
            }
        } else {
            console.error('Unsupported file type or library not loaded:', fileExtension);
            this.showToast('Error', `Unsupported file type (${fileExtension || 'none'}) or library not loaded`, 'error');
            this.htmlOutput = '';
        }
        this.retryPreviewUpdate();
    }

    base64ToArrayBuffer(base64) {
        try {
            const binary = atob(base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            console.log('base64ToArrayBuffer: Converted base64 to ArrayBuffer');
            return bytes.buffer;
        } catch (error) {
            console.error('Error in base64ToArrayBuffer:', error);
            this.showToast('Error', `Failed to process file content: ${error.message}`, 'error');
            throw error;
        }
    }

    handleHtmlChange(event) {
        this.htmlOutput = event.target.value || '';
        console.log('handleHtmlChange: htmlOutput updated:', this.htmlOutput);
        this.showContent = true;
        this.retryPreviewUpdate();
    }

    handleApplyChanges() {
        console.log('handleApplyChanges: Applying changes to preview');
        this.activeTab = 'preview';
        this.retryPreviewUpdate();
    }

    handleTabChange(event) {
        this.activeTab = event.target.value;
        console.log('handleTabChange: Switched to tab:', this.activeTab);
        if (this.activeTab === 'preview') {
            this.retryPreviewUpdate();
        }
    }

    retryPreviewUpdate(attempts = 10, delay = 500) {
        const tryUpdate = (remainingAttempts) => {
            const container = this.template.querySelector('div.preview-container[data-preview="true"]');
            console.log('retryPreviewUpdate: Attempting to find container, attempt:', attempts - remainingAttempts + 1, 'DOM available:', !!container);
            if (container) {
                try {
                    // Clear container
                    container.innerHTML = '';
                    if (this.htmlOutput) {
                        container.innerHTML = this.htmlOutput;
                        console.log('retryPreviewUpdate: Preview updated with htmlOutput:', this.htmlOutput);
                    } else {
                        container.innerHTML = '<p>No content to display</p>';
                        console.log('retryPreviewUpdate: Preview cleared (empty htmlOutput)');
                    }
                } catch (error) {
                    console.error('retryPreviewUpdate: Error rendering HTML:', error);
                    this.showToast('Error', 'Failed to render preview: ' + error.message, 'error');
                }
            } else if (remainingAttempts > 0) {
                console.warn('retryPreviewUpdate: Container not found, retrying...', { remainingAttempts, htmlOutput: this.htmlOutput });
                setTimeout(() => tryUpdate(remainingAttempts - 1), delay);
            } else {
                console.error('retryPreviewUpdate: Failed to find preview container after retries', { htmlOutput: this.htmlOutput });
                this.showToast('Warning', 'Preview container not found; please try switching tabs or re-uploading.', 'warning');
                console.log('DOM structure:', Array.from(this.template.querySelectorAll('div')).map(div => div.outerHTML));
            }
        };
        tryUpdate(attempts);
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }
}