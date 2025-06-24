import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAvailableDocuments from '@salesforce/apex/AuthentisignWizardController.getAvailableDocuments';
import checkForDuplicateDocument from '@salesforce/apex/AuthentisignWizardController.checkForDuplicateDocument';
import uploadDocumentToAuthentisign from '@salesforce/apex/AuthentisignWizardController.uploadDocumentToAuthentisign';

export default class DocumentUploadStep extends LightningElement {
    @api configId;
    @track documents = [];
    @track selectedDocumentId;
    @track isLoading = false;
    @track error;

    connectedCallback() {
        console.log('documentUploadStep: connectedCallback triggered, configId=', this.configId);
        this.fetchDocuments();
    }

    fetchDocuments() {
        console.log('fetchDocuments: Starting document fetch');
        this.isLoading = true;
        getAvailableDocuments()
            .then(result => {
                console.log('fetchDocuments: Raw result=', JSON.stringify(result));
                this.documents = Array.isArray(result) ? result.map(doc => {
                    const mappedDoc = {
                        label: doc.Title || 'Untitled Document',
                        value: doc.Id
                    };
                    console.log('fetchDocuments: Mapped document=', JSON.stringify(mappedDoc));
                    return mappedDoc;
                }) : [];
                console.log('fetchDocuments: Documents set=', JSON.stringify(this.documents));
                this.isLoading = false;
                if (this.documents.length === 0) {
                    this.error = 'No PDF documents found. Please upload a PDF.';
                    this.showToast('Warning', this.error, 'warning');
                }
                // Force UI refresh
                this.documents = [...this.documents];
            })
            .catch(error => {
                this.error = error.body?.message || 'Error fetching documents';
                console.log('fetchDocuments error:', JSON.stringify(error));
                this.showToast('Error', this.error, 'error');
                this.isLoading = false;
            });
    }

    handleDocumentChange(event) {
        this.selectedDocumentId = event.detail.value;
        this.error = null;
        const selectedDoc = this.documents.find(doc => doc.value === this.selectedDocumentId);
        if (selectedDoc) {
            console.log('handleDocumentChange: Selected document=', JSON.stringify(selectedDoc));
            this.dispatchEvent(new CustomEvent('documentselect', {
                detail: {
                    documentId: this.selectedDocumentId,
                    externalDocId: null,
                    title: selectedDoc.label
                }
            }));
        }
    }

    handleClearSelection() {
        this.selectedDocumentId = null;
        this.error = null;
        console.log('handleClearSelection: Cleared document selection');
        this.dispatchEvent(new CustomEvent('documentselect', {
            detail: {
                documentId: null,
                externalDocId: null,
                title: null
            }
        }));
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            this.isLoading = true;
            console.log('handleFileUpload: File selected=', file.name);
            checkForDuplicateDocument({ fileName: file.name, configId: this.configId })
                .then(duplicateId => {
                    if (duplicateId) {
                        this.error = 'A document with this name already exists.';
                        this.showToast('Error', this.error, 'error');
                        this.isLoading = false;
                    } else {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64Data = reader.result.split(',')[1];
                            this.uploadFile(file.name, base64Data);
                        };
                        reader.readAsDataURL(file);
                    }
                })
                .catch(error => {
                    this.error = error.body?.message || 'Error checking for duplicate document';
                    console.log('handleFileUpload error:', JSON.stringify(error));
                    this.showToast('Error', this.error, 'error');
                    this.isLoading = false;
                });
        } else {
            this.error = 'Please upload a valid PDF file.';
            this.showToast('Error', this.error, 'error');
        }
    }

    uploadFile(fileName, base64Data) {
        console.log('uploadFile: Uploading file=', fileName);
        const contentVersion = {
            Title: fileName,
            PathOnClient: fileName,
            VersionData: base64Data,
            FirstPublishLocationId: this.configId
        };

        const contentVersionJSON = JSON.stringify(contentVersion);
        const blob = new Blob([contentVersionJSON], { type: 'application/json' });
        
        const formData = new FormData();
        formData.append('entity_content', blob, fileName);

        fetch('/services/data/v64.0/sobjects/ContentVersion', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': 'Bearer ' + this.getSessionId()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.id) {
                console.log('uploadFile: ContentVersion created, id=', data.id);
                uploadDocumentToAuthentisign({ contentDocumentId: data.id, configId: this.configId })
                    .then(externalDocId => {
                        this.selectedDocumentId = data.id;
                        this.dispatchEvent(new CustomEvent('documentselect', {
                            detail: {
                                documentId: data.id,
                                externalDocId: externalDocId,
                                title: fileName
                            }
                        }));
                        this.showToast('Success', 'Document uploaded successfully', 'success');
                        this.isLoading = false;
                        this.fetchDocuments(); // Refresh document list
                    })
                    .catch(error => {
                        this.error = error.body?.message || 'Error uploading document to Authentisign';
                        console.log('uploadFile error:', JSON.stringify(error));
                        this.showToast('Error', this.error, 'error');
                        this.isLoading = false;
                    });
            } else {
                this.error = 'Failed to upload document';
                this.showToast('Error', this.error, 'error');
                this.isLoading = false;
            }
        })
        .catch(error => {
            this.error = 'Error uploading document: ' + error.message;
            console.log('uploadFile error:', JSON.stringify(error));
            this.showToast('Error', this.error, 'error');
            this.isLoading = false;
        });
    }

    getSessionId() {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith('sid='))
            ?.split('=')[1];
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