import { LightningElement, track, api } from 'lwc';
export default class AuthentisignWizard extends LightningElement {
    @api recordId;
    connectedCallback() {
        if (this.recordId) {
            console.log('Record ID:', this.recordId);
        }
    }
    @track currentStep = '1';
    @track documentId;
    @track recipients = [];
    @track fieldMappings = {};
    @track placedFields = [];

    get isBackDisabled() {
        return this.currentStep === '1';
    }

    get isNextDisabled() {
        return this.currentStep === '5';
    }

    get isSubmitDisabled() {
        return this.currentStep !== '5';
    }

    handleNext(event) {
        const nextStep = parseInt(this.currentStep) + 1;
        if (nextStep <= 5) {
            this.currentStep = nextStep.toString();
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