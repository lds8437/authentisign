import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AuthentisignWizard extends LightningElement {
    @api recordId;
    @api configId;
    @track currentStep = '1';
    @track documentId;
    @track externalDocId;
    @track documentTitle;
    @track recipients = [];
    @track fieldMappings;
    @track placedFields;
    @track error;

    // Step labels for display
    stepLabels = [
        { value: '1', label: 'Step 1: Upload Document' },
        { value: '2', label: 'Step 2: Select Recipients' },
        { value: '3', label: 'Step 3: Map Fields' },
        { value: '4', label: 'Step 4: Place Fields' },
        { value: '5', label: 'Step 5: Review and Send' }
    ];

    get currentStepLabel() {
        const step = this.stepLabels.find(s => s.value === this.currentStep);
        return step ? step.label : '';
    }

    get isStep1() {
        return this.currentStep === '1';
    }

    get isStep2() {
        return this.currentStep === '2';
    }

    get isStep3() {
        return this.currentStep === '3';
    }

    get isStep4() {
        return this.currentStep === '4';
    }

    get isStep5() {
        return this.currentStep === '5';
    }

    get isPreviousDisabled() {
        return this.currentStep === '1';
    }

    handleDocumentSelect(event) {
        this.documentId = event.detail.documentId;
        this.externalDocId = event.detail.externalDocId;
        this.documentTitle = event.detail.title;
        this.error = null;
        console.log('handleDocumentSelect: documentId=', this.documentId, 'title=', this.documentTitle);
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
            this.recipients.length > 0 ? 'Success' : 'Error',
            this.recipients.length > 0 ? 'Recipients confirmed successfully' : 'Please select at least one recipient.',
            this.recipients.length > 0 ? 'success' : 'error'
        );
    }

    handlePrevious() {
        const stepInt = parseInt(this.currentStep);
        if (stepInt > 1) {
            this.currentStep = (stepInt - 1).toString();
            this.error = null;
        }
    }

    handleNext() {
        const stepInt = parseInt(this.currentStep);
        if (stepInt < 5) {
            this.currentStep = (stepInt + 1).toString();
            this.error = null;
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