import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAvailableDocuments from '@salesforce/apex/AuthentisignWizardController.getAvailableDocuments';
import uploadDocumentToAuthentisign from '@salesforce/apex/AuthentisignWizardController.uploadDocumentToAuthentisign';
import checkForDuplicateDocument from '@salesforce/apex/AuthentisignWizardController.checkForDuplicateDocument';

export default class DocumentUploadStep extends LightningElement {
    @api configId;
    @track documents = [];
    @track selectedDocumentId;
    @track selectedFileName;
    @track uploadedDocumentId;
    @track externalDocId;
    @track error;

    connectedCallback() {
        console.log('documentUploadStep configId:', this.configId);
        if (!this.configId) {
            this.error = 'Configuration ID is missing. Please ensure the wizard is properly initialized.';
            this.showToast('Error', this.error, 'error');
        }
        getAvailableDocuments()
            .then(result => {
                this.documents = result;
            })
            .catch(error => {
                this.error = error.body?.message || 'Error fetching documents';
                console.error('Error in getAvailableDocuments:', error);
                this.showToast('Error', this.error, 'error');
                this.dispatchEvent(new CustomEvent('documentselect', {
                    detail: { documentId: null, externalDocId: null },
                    bubbles: true,
                    composed: true
                }));
            });
    }

    get documentOptions() {
        return this.documents.map(doc => ({
            label: doc.Title,
            value: doc.Id
        }));
    }
    
    get isDropdownDisabled() {
        return !!this.uploadedDocumentId || !!this.selectedFileName;
    }
    
    get isFileUploadDisabled() {
        return !!this.selectedDocumentId;
    }
    
    get isClearDisabled() {
        return !this.selectedDocumentId && !this.uploadedDocumentId && !this.selectedFileName;
    }

    handleDocumentSelect(event) {
        this.selectedDocumentId = event.detail.value;
        this.error = null;
        this.selectedFileName = null;
        this.uploadedDocumentId = null;
        if (this.selectedDocumentId) {
            this.uploadExistingDocument();
        } else {
            this.externalDocId = null;
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { documentId: null, externalDocId: null },
                bubbles: true,
                composed: true
            }));
        }
    }

    async handleFileUpload(event) {
        const file = event.detail.files[0];
        this.selectedFileName = file.name;
        this.uploadedDocumentId = file.documentId;
        this.selectedDocumentId = null;
        this.error = null;

        try {
            const existingDocId = await checkForDuplicateDocument({ fileName: file.name });
            if (existingDocId) {
                this.error = `Duplicate document found: ${file.name}`;
                this.showToast('Error', this.error, 'error');
                console.error('Duplicate document found:', existingDocId);
                this.selectedFileName = null;
                this.uploadedDocumentId = null;
                this.dispatchEvent(new CustomEvent('documentselect', {
                    detail: { documentId: null, externalDocId: null },
                    bubbles: true,
                    composed: true
                }));
                return;
            }
            await this.uploadNewDocument();
        } catch (error) {
            this.error = error.body?.message || 'Error uploading new document';
            this.showToast('Error', this.error, 'error');
            console.error('Error in handleFileUpload:', error);
            this.selectedFileName = null;
            this.uploadedDocumentId = null;
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { documentId: null, externalDocId: null },
                bubbles: true,
                composed: true
            }));
        }
    }

    handleClearSelection() {
        this.selectedDocumentId = null;
        this.selectedFileName = null;
        this.uploadedDocumentId = null;
        this.externalDocId = null;
        this.error = null;
        this.dispatchEvent(new CustomEvent('documentselect', {
            detail: { documentId: null, externalDocId: null },
            bubbles: true,
            composed: true
        }));
    }

    async uploadExistingDocument() {
        if (!this.selectedDocumentId || !this.configId) {
            this.error = `Missing document ID or configuration ID (documentId: ${this.selectedDocumentId}, configId: ${this.configId})`;
            this.showToast('Error', this.error, 'error');
            console.error('Invalid state in uploadExistingDocument:', {
                selectedDocumentId: this.selectedDocumentId,
                configId: this.configId
            });
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { documentId: null, externalDocId: null },
                bubbles: true,
                composed: true
            }));
            return;
        }

        try {
            const externalDocId = await uploadDocumentToAuthentisign({ 
                contentDocumentId: this.selectedDocumentId, 
                configId: this.configId 
            });
            this.externalDocId = externalDocId;
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { 
                    documentId: this.selectedDocumentId, 
                    externalDocId 
                },
                bubbles: true,
                composed: true
            }));
            this.showToast('Success', 'Document selected successfully', 'success');
        } catch (error) {
            this.error = error.body?.message || 'Error uploading existing document';
            this.showToast('Error', this.error, 'error');
            console.error('Error in uploadExistingDocument:', error);
            this.selectedDocumentId = null;
            this.externalDocId = null;
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { documentId: null, externalDocId: null },
                bubbles: true,
                composed: true
            }));
        }
    }

    async uploadNewDocument() {
        if (!this.uploadedDocumentId || !this.configId) {
            this.error = `Missing document ID or configuration ID (documentId: ${this.uploadedDocumentId}, configId: ${this.configId})`;
            this.showToast('Error', this.error, 'error');
            console.error('Invalid state in uploadNewDocument:', {
                uploadedDocumentId: this.uploadedDocumentId,
                configId: this.configId
            });
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { documentId: null, externalDocId: null },
                bubbles: true,
                composed: true
            }));
            return;
        }

        try {
            const externalDocId = await uploadDocumentToAuthentisign({ 
                contentDocumentId: this.uploadedDocumentId, 
                configId: this.configId 
            });
            this.externalDocId = externalDocId;
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { 
                    documentId: this.uploadedDocumentId, 
                    externalDocId 
                },
                bubbles: true,
                composed: true
            }));
            this.showToast('Success', 'Document uploaded successfully', 'success');
        } catch (error) {
            this.error = error.body?.message || 'Error uploading new document';
            this.showToast('Error', this.error, 'error');
            console.error('Error in uploadNewDocument:', error);
            this.selectedFileName = null;
            this.uploadedDocumentId = null;
            this.externalDocId = null;
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: { documentId: null, externalDocId: null },
                bubbles: true,
                composed: true
            }));
        }
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