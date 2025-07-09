import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AuthentisignWizard extends LightningElement {
    @api recordId;
    @api configId;
    @track currentStep = '1';
    @track documentId;
    @track documentTitle;
    @track externalDocId;
    @track recipients = [];
    @track mergeFields = [];
    @track fieldMappings;
    @track placedFields;
    @track error;

    stepLabels = [
        { value: '1', label: 'Step 1: Upload Document' },
        { value: '2', label: 'Step 2: Select Recipients' },
        { value: '3', label: 'Step 3: Map Merge Fields' },
        { value: '4', label: 'Step 4: Place Fields' },
        { value: '5', label: 'Step 5: Authentisign Content Configuration' },
        { value: '6', label: 'Step 6: Review and Send' }
    ];

    get currentStepLabel() {
        const step = this.stepLabels.find(s => s.value === this.currentStep);
        return step ? step.label : 'Unknown Step';
    }

    get isStep1() { return this.currentStep === '1'; }
    get isStep2() { return this.currentStep === '2'; }
    get isStep3() { return this.currentStep === '3'; }
    get isStep4() { return this.currentStep === '4'; }
    get isStep5() { return this.currentStep === '5'; }
    get isStep6() { return this.currentStep === '6'; }

    get isPreviousDisabled() { return this.currentStep === '1'; }
    get isNextDisabled() {
        if (this.currentStep === '1' && !this.documentId) return true;
        return false;
    }

    connectedCallback() {
        console.log('authentisignWizard: connectedCallback, recordId=', this.recordId, 'configId=', this.configId, 'currentStep=', this.currentStep);
    }

    handleDocumentSelect(event) {
        this.documentId = event.detail.documentId;
        this.externalDocId = event.detail.externalDocId;
        this.documentTitle = event.detail.title;
        this.error = null;
        console.log('handleDocumentSelect: documentId=', this.documentId, 'externalDocId=', this.externalDocId, 'documentTitle=', this.documentTitle);
        this.showToast(
            this.documentId ? 'Success' : 'Error',
            this.documentId ? 'Document selected successfully' : 'Please select or upload a valid document.',
            this.documentId ? 'success' : 'error'
        );
    }

    handleRecipientSelect(event) {
        this.recipients = event.detail.recipients || [];
        this.error = null;
        console.log('handleRecipientSelect: recipients=', JSON.stringify(this.recipients));
        this.showToast(
            this.recipients.length > 0 ? 'Success' : 'Info',
            this.recipients.length > 0 ? 'Recipients confirmed successfully' : 'No recipients selected yet.',
            this.recipients.length > 0 ? 'success' : 'info'
        );
    }

    handleFieldMapping(event) {
        this.mergeFields = event.detail.mergeFields || [];
        this.error = null;
        console.log('handleFieldMapping: mergeFields=', JSON.stringify(this.mergeFields));
        this.showToast(
            this.mergeFields.length > 0 ? 'Success' : 'Info',
            this.mergeFields.length > 0 ? 'Merge fields updated successfully' : 'No merge fields added yet.',
            this.mergeFields.length > 0 ? 'success' : 'info'
        );
    }

    handlePrevious() {
        const stepInt = parseInt(this.currentStep);
        if (stepInt > 1) {
            this.currentStep = (stepInt - 1).toString();
            this.error = null;
            console.log('handlePrevious: currentStep=', this.currentStep);
        }
    }

    handleNext() {
        const stepInt = parseInt(this.currentStep);
        if (stepInt < 6) { // Updated max step to 6
            if (this.isNextDisabled) {
                this.error = 'Please complete the current step before proceeding.';
                this.showToast('Error', this.error, 'error');
                console.log('handleNext: Next disabled, error=', this.error);
                return;
            }
            this.currentStep = (stepInt + 1).toString();
            this.error = null;
            console.log('handleNext: currentStep=', this.currentStep);
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