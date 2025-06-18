import { LightningElement, api } from 'lwc';
import getAvailableDocuments from '@salesforce/apex/AuthentisignWizardController.getAvailableDocuments';
import uploadDocumentToAuthentisign from '@salesforce/apex/AuthentisignWizardController.uploadDocumentToAuthentisign';

export default class DocumentUploadStep extends LightningElement {
    @api configId; // Passed from parent wizard
    documents = [];
    selectedDocumentId;
    error;

    connectedCallback() {
        getAvailableDocuments()
            .then(result => {
                this.documents = result;
            })
            .catch(error => {
                this.error = error.body.message;
            });
    }

    handleDocumentSelect(event) {
        this.selectedDocumentId = event.detail.value;
    }

    handleUpload() {
        if (this.selectedDocumentId && this.configId) {
            uploadDocumentToAuthentisign({ contentDocumentId: this.selectedDocumentId, configId: this.configId })
                .then(externalDocId => {
                    this.dispatchEvent(new CustomEvent('documentselect', {
                        detail: { documentId: this.selectedDocumentId, externalDocId }
                    }));
                })
                .catch(error => {
                    this.error = error.body.message;
                });
        }
    }
}