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
        console.log('Document available:', !!document);
        if (!this.mammothInitialized) {
            this.mammothInitialized = true;
            try {
                console.log('Loading Mammoth.js from:', MAMMOTH);
                await loadScript(this, MAMMOTH).catch(err => {
                    throw new Error('loadScript for MAMMOTH failed: ' + (err?.message || 'Unknown error') + ' (Stack: ' + (err?.stack || 'no stack') + ')');
                });
                console.log('Mammoth.js loaded successfully, window.mammoth:', !!window.mammoth);
                if (!window.mammoth) {
                    throw new Error('Mammoth.js not initialized');
                }
            } catch (error) {
                console.error('Error loading Mammoth.js:', error.message, 'Stack:', error.stack);
                this.showToast('Error', 'Failed to load Mammoth.js library: ' + (error?.message || 'Unknown error'), 'error');
            }
        }
        if (!this.pdfJsInitialized) {
            this.pdfJsInitialized = true;
            try {
                console.log('Loading PDF.js from:', PDFJS);
                console.log('Testing PDFJS resource availability...');
                const response = await fetch(PDFJS + '?t=' + Date.now());
                if (!response.ok) {
                    throw new Error(`Failed to fetch PDFJS resource: HTTP ${response.status} ${response.statusText}`);
                }
                const content = await response.text();
                console.log('PDFJS resource content preview:', content.slice(0, 100), 'length:', content.length);
                console.log('Attempting to load PDF.js script...');
                await loadScript(this, PDFJS + '?t=' + Date.now()).catch(err => {
                    throw new Error('loadScript for PDFJS failed: ' + (err?.message || 'Unknown error') + ' (Stack: ' + (err?.stack || 'no stack') + ')');
                });
                console.log('PDF.js loaded successfully, window.pdfjsLib:', !!window.pdfjsLib, 'version:', window.pdfjsLib?.version || 'unknown');
                console.log('PDF.js properties:', Object.keys(window.pdfjsLib || {}));
                console.log('PDF.js getDocument available:', !!window.pdfjsLib?.getDocument);
                console.log('PDF.js full object:', window.pdfjsLib);
                if (!window.pdfjsLib || !window.pdfjsLib.getDocument) {
                    throw new Error('PDF.js or getDocument not initialized');
                }
                console.log('Attempting to load PDF worker from:', PDFWORKER);
                try {
                    const workerResponse = await fetch(PDFWORKER + '?t=' + Date.now());
                    if (!workerResponse.ok) {
                        throw new Error(`Failed to fetch PDFWORKER resource: HTTP ${workerResponse.status} ${workerResponse.statusText}`);
                    }
                    const workerContent = await workerResponse.text();
                    console.log('PDFWORKER resource content preview:', workerContent.slice(0, 100), 'length:', workerContent.length);
                    await loadScript(this, PDFWORKER + '?t=' + Date.now());
                    console.log('PDF worker loaded successfully');
                    if (window.pdfjsLib.GlobalWorkerOptions) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWORKER;
                        console.log('PDF worker configured with workerSrc:', PDFWORKER);
                    } else {
                        console.warn('GlobalWorkerOptions not available, proceeding without worker');
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                        console.log('PDF worker disabled with empty workerSrc to avoid structuredClone issues');
                    }
                } catch (workerError) {
                    console.warn('Failed to load PDF worker, proceeding without worker:', workerError.message, 'Stack:', workerError.stack);
                    if (window.pdfjsLib.GlobalWorkerOptions) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                        console.log('PDF worker disabled with empty workerSrc due to load failure');
                    }
                }
            } catch (error) {
                console.error('Error loading PDF.js:', error.message, 'Stack:', error.stack);
                this.showToast('Error', 'Failed to load PDF.js library: ' + (error?.message || 'Unknown error'), 'error');
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
            this.showToast('Error', 'Invalid file extension: ' + fileExtension, 'error');
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
                this.showToast('Error', 'Failed to read file: ' + (reader.error?.message || 'Unknown error'), 'error');
                this.htmlOutput = '';
                this.retryPreviewUpdate();
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error processing file:', error.message, 'Stack:', error.stack);
            this.showToast('Error', 'Failed to process file: ' + (error?.message || 'Unknown error'), 'error');
            this.htmlOutput = '';
            this.retryPreviewUpdate();
        }
    }

    async convertToHtml(fileContent, fileExtension) {
        console.log('convertToHtml: Starting conversion for', fileExtension);
        console.log('Library availability:', { hasMammoth: !!window.mammoth, hasPdfjsLib: !!window.pdfjsLib, hasGetDocument: !!window.pdfjsLib?.getDocument });
        if (fileExtension === 'docx' && window.mammoth) {
            try {
                const result = await window.mammoth.convertToHtml({ arrayBuffer: this.base64ToArrayBuffer(fileContent) });
                this.htmlOutput = result.value || '<p>No content extracted from Word document</p>';
                console.log('Word document converted, htmlOutput:', this.htmlOutput);
            } catch (error) {
                console.error('Error converting Word document:', error.message, 'Stack:', error.stack);
                this.showToast('Error', 'Failed to convert Word document: ' + (error?.message || 'Unknown error'), 'error');
                this.htmlOutput = '';
            }
        } else if (fileExtension === 'pdf' && window.pdfjsLib && window.pdfjsLib.getDocument) {
            try {
                console.log('Starting PDF processing, workerSrc:', window.pdfjsLib.GlobalWorkerOptions?.workerSrc || 'disabled');
                console.log('Worker options:', window.pdfjsLib.GlobalWorkerOptions || 'not available');
                console.log('Document available for PDF.js:', !!document);
                const arrayBuffer = this.base64ToArrayBuffer(fileContent);
                console.log('ArrayBuffer size:', arrayBuffer.byteLength);
                if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                    throw new Error('Invalid or empty PDF data');
                }
                console.log('Loading PDF document...');
                console.log('Before getDocument call:', window.pdfjsLib.getDocument.toString());
                const pdf = await window.pdfjsLib.getDocument({
                    data: arrayBuffer,
                    disableFontFace: true,
                    disableRange: true,
                    disableStream: true,
                    disableAutoFetch: true,
                    enableXfa: false,
                    ownerDocument: document
                }).promise.catch(err => {
                    throw new Error('getDocument failed: ' + (err?.message || 'Unknown error') + ' (Stack: ' + (err?.stack || 'no stack') + ')');
                });
                console.log('PDF loaded, pages:', pdf.numPages);
                console.log('PDF document object:', pdf);
                let page;
                try {
                    page = await pdf.getPage(1);
                    console.log('Page 1 loaded');
                } catch (pageError) {
                    throw new Error('getPage failed: ' + (pageError?.message || 'Unknown error') + ' (Stack: ' + (pageError?.stack || 'no stack') + ')');
                }
                let textContent;
                try {
                    textContent = await page.getTextContent();
                    console.log('Page 1 text items:', textContent.items.length);
                    console.log('TextContent object:', textContent);
                    console.log('Text items:', textContent.items);
                } catch (textError) {
                    throw new Error('getTextContent failed: ' + (textError?.message || 'Unknown error') + ' (Stack: ' + (textError?.stack || 'no stack') + ')');
                }
                const htmlContent = textContent.items.map(item => {
                    const text = item.str
                        .replace(/&/g, '&')
                        .replace(/</g, '<')
                        .replace(/>/g, '>')
                        .replace(/"/g, '"')
                        .replace(/'/g, '');
                    return '<p>' + text + '</p>';
                }).join('');
                this.htmlOutput = '<div><h2>Page 1</h2>' + (htmlContent || '<p>No content extracted from PDF</p>') + '</div>';
                console.log('PDF converted, htmlOutput:', this.htmlOutput);
            } catch (error) {
                console.error('Error converting PDF:', error.message, 'Stack:', error.stack);
                this.showToast('Error', 'Failed to convert PDF: ' + (error?.message || 'Unknown error'), 'error');
                this.htmlOutput = '<p>Failed to convert PDF</p>';
            }
        } else {
            console.error('Unsupported file type or PDF.js not loaded:', fileExtension);
            this.showToast('Error', 'Unsupported file type (' + (fileExtension || 'none') + ') or PDF.js not loaded', 'error');
            this.htmlOutput = '<p>Unsupported file type or PDF.js not loaded</p>';
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
            console.log('base64ToArrayBuffer: Converted base64 to ArrayBuffer, size:', len);
            return bytes.buffer;
        } catch (error) {
            console.error('Error in base64ToArrayBuffer:', error.message, 'Stack:', error.stack);
            this.showToast('Error', 'Failed to process file content: ' + (error?.message || 'Unknown error'), 'error');
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
                    container.innerHTML = '';
                    if (this.htmlOutput) {
                        container.innerHTML = this.htmlOutput;
                        console.log('retryPreviewUpdate: Preview updated with htmlOutput:', this.htmlOutput);
                    } else {
                        container.innerHTML = '<p>No content to display</p>';
                        console.log('retryPreviewUpdate: Preview cleared (empty htmlOutput)');
                    }
                } catch (error) {
                    console.error('Error rendering HTML:', error.message, 'Stack:', error.stack);
                    this.showToast('Error', 'Failed to render preview: ' + (error?.message || 'Unknown error'), 'error');
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