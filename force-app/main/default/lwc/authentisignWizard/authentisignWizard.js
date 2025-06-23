import { LightningElement, track, api } from 'lwc';
export default class AuthentisignWizard extends LightningElement {
    @api recordId;
    @api configId;
    @track currentStep = '1';
    @track documentId;
    @track externalDocId;
    @track error;
    @track recipients = [];
    @track fieldMappings = {};
    @track placedFields = [];

    get isStep1() { return this.currentStep === '1'; }
    get isStep2() { return this.currentStep === '2'; }
    get isNextDisabled() {
        if (this.currentStep === '1') {
            return !this.documentId || !this.externalDocId;
        }
        // Other step conditions...
        return false;
    }
    get isBackDisabled() {
        return this.currentStep === '1';
    }

    get isNextDisabled() {
        return this.currentStep === '5';
    }

    get isSubmitDisabled() {
        return this.currentStep !== '5';
    }

    handleNext() {
        if (!this.isNextDisabled) {
            this.currentStep = (parseInt(this.currentStep) + 1).toString();
            this.error = null;
        }
    }

    handleBack(event) {
        const prevStep = parseInt(this.currentStep) - 1;
        if (prevStep >= 1) {
            this.currentStep = prevStep.toString();
        }
    }

    handleDocumentSelect(event) {
        this.documentId = event.detail.documentId;
        this.externalDocId = event.detail.externalDocId;
        this.error = this.documentId && this.externalDocId ? null : 'Please select or upload a valid document.';
    }

    handleRecipientSelect(event) {
        this.recipients = event.detail.recipients;
    }

    handleFieldMap(event) {
        this.fieldMappings = event.detail.mappings;
    }

    handleFieldPlace(event) {
        this.placedFields = event.detail.placedFields;
    }

    handleSend() {
        // Trigger final send to Authentisign API
        this.dispatchEvent(
            new CustomEvent('send', {
                detail: {
                    documentId: this.documentId,
                    recipients: this.recipients,
                    fieldMappings: this.fieldMappings,
                    placedFields: this.placedFields
                }
            })
        );
    }
}