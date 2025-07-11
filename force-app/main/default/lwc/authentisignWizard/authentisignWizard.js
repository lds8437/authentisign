import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import TEMPLATE_OBJECT from '@salesforce/schema/Template__c';
import NAME_FIELD from '@salesforce/schema/Template__c.Name';
import saveTemplate from '@salesforce/apex/AuthentisignWizardController.saveTemplate';

export default class AuthentisignWizard extends LightningElement {
    @api recordId;
    @track currentStep = '1';
    @track documentId;
    @track externalDocId;
    @track documentTitle;
    @track configId;
    @track mergeFields = [];
    @track error;
    @track selectedTemplateOption = 'new'; // Default to 'Create a new template'
    @track selectedTemplateId;
    @track templateRecords = [];
    @track showExistingTemplates = false;
    @track classStep1 = 'slds-path__item slds-is-current slds-is-active'; // Initial state
    @track classStep2 = 'slds-path__item slds-is-incomplete';
    @track classStep3 = 'slds-path__item slds-is-incomplete';
    @track classStep4 = 'slds-path__item slds-is-incomplete';
    @track ariaSelectedStep1 = true; // Initial state
    @track ariaSelectedStep2 = false;
    @track ariaSelectedStep3 = false;
    @track ariaSelectedStep4 = false;
    @track tabIndexStep1 = '0'; // Initial state
    @track tabIndexStep2 = '-1';
    @track tabIndexStep3 = '-1';
    @track tabIndexStep4 = '-1';
    @track isTemplateSaved = false; // Track save success
    @track hasUploadedDocument = false; // Track document upload

    // Step getters
    get isStep1() { return this.currentStep === '1'; }
    get isStep2() { return this.currentStep === '2'; }
    get isStep3() { return this.currentStep === '3'; }
    get isStep4() { return this.currentStep === '4'; }
    get isPreviousDisabled() { return this.currentStep === '1'; }
    get isNextDisabled() { return !this.canProceed(); }

    // Template options
    get templateOptions() {
        return [
            { label: 'Create a new template', value: 'new' },
            { label: 'Select an existing template', value: 'existing' }
        ];
    }

    // Wire to fetch template records
    @wire(getObjectInfo, { objectApiName: TEMPLATE_OBJECT })
    objectInfo;

    @wire(getRecord, { recordId: '$selectedTemplateId', fields: [NAME_FIELD] })
    templateRecord;

    connectedCallback() {
        this.fetchTemplates();
        this.updatePathClasses(); // Initialize path classes
    }

    fetchTemplates() {
        if (this.objectInfo.data) {
            // Simulate fetching templates (replace with actual SOQL in production)
            this.templateRecords = [
                { label: 'Template 1', value: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6' },
                { label: 'Template 2', value: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5q7' }
            ];
        }
    }

    handleTemplateOptionChange(event) {
        this.selectedTemplateOption = event.target.value;
        this.showExistingTemplates = this.selectedTemplateOption === 'existing';
        this.selectedTemplateId = undefined;
        if (this.showExistingTemplates && this.templateRecords.length > 0) {
            this.selectedTemplateId = this.templateRecords[0].value;
        }
        this.updatePathClasses();
    }

    handleTemplateSelect(event) {
        this.selectedTemplateId = event.target.value;
        if (this.selectedTemplateId) {
            this.handleNext(); // Skip to Step 3 if existing template selected
        }
    }

    handleTemplateSave(event) {
        const { htmlOutput, fileType, name, objectApiName } = event.detail;
        console.log('handleTemplateSave: Received event', { htmlOutput, fileType, name, objectApiName });
        saveTemplate({ name, body: htmlOutput, fileType, objectApiName })
            .then(() => {
                console.log('handleTemplateSave: Template saved successfully');
                this.showToast('Success', 'Template saved successfully', 'success');
                this.fetchTemplates(); // Refresh template list
                this.isTemplateSaved = true; // Show success indicator
                this.updatePathClasses(); // Update path state
            })
            .catch(error => {
                this.error = error.body?.message || error.message || 'Unknown error saving template';
                this.showToast('Error', this.error, 'error');
                console.error('Save Template Error:', {
                    message: error.body?.message || error.message,
                    status: error.body?.status,
                    stack: error.body?.stackTrace,
                    fullError: JSON.stringify(error)
                });
            });
    }

    handleDocumentSelect(event) {
        console.log('handleDocumentSelect: Received event', event.detail);
        this.documentId = event.detail.documentId;
        this.documentTitle = event.detail.documentTitle;
        this.hasUploadedDocument = true; // Set flag when document is uploaded
        this.updatePathClasses();
    }

    handleRecipientSelect(event) {
        // Handle recipient selection logic
    }

    handleFieldMapping(event) {
        this.mergeFields = event.detail.mergeFields;
    }

    handleNext() {
        if (this.canProceed()) {
            if (this.isStep1 && this.selectedTemplateOption === 'existing' && this.selectedTemplateId) {
                this.currentStep = '3'; // Skip to Step 3 for existing template
            } else {
                const nextStep = String(parseInt(this.currentStep) + 1);
                this.currentStep = nextStep;
            }
            this.error = undefined;
            this.isTemplateSaved = false; // Reset save indicator on next step
            this.updatePathClasses();
        }
    }

    handlePrevious() {
        const prevStep = String(parseInt(this.currentStep) - 1);
        this.currentStep = prevStep;
        this.error = undefined;
        this.isTemplateSaved = false; // Reset save indicator on previous step
        this.updatePathClasses();
    }

    canProceed() {
        if (this.isStep1) return this.selectedTemplateOption !== 'existing' || !!this.selectedTemplateId;
        if (this.isStep2) return this.hasUploadedDocument; // Enable Next when document is uploaded
        return true;
    }

    // Update path item classes and accessibility attributes based on current step
    updatePathClasses() {
        const currentStepNum = parseInt(this.currentStep);
        this.classStep1 = currentStepNum > 1 ? 'slds-path__item slds-is-complete' : (currentStepNum === 1 ? 'slds-path__item slds-is-current slds-is-active' : 'slds-path__item slds-is-incomplete');
        this.classStep2 = currentStepNum > 2 ? 'slds-path__item slds-is-complete' : (currentStepNum === 2 ? 'slds-path__item slds-is-current slds-is-active' : 'slds-path__item slds-is-incomplete');
        this.classStep3 = currentStepNum > 3 ? 'slds-path__item slds-is-complete' : (currentStepNum === 3 ? 'slds-path__item slds-is-current slds-is-active' : 'slds-path__item slds-is-incomplete');
        this.classStep4 = currentStepNum === 4 ? 'slds-path__item slds-is-current slds-is-active' : 'slds-path__item slds-is-incomplete';
        this.ariaSelectedStep1 = currentStepNum === 1;
        this.ariaSelectedStep2 = currentStepNum === 2;
        this.ariaSelectedStep3 = currentStepNum === 3;
        this.ariaSelectedStep4 = currentStepNum === 4;
        this.tabIndexStep1 = currentStepNum === 1 ? '0' : '-1';
        this.tabIndexStep2 = currentStepNum === 2 ? '0' : '-1';
        this.tabIndexStep3 = currentStepNum === 3 ? '0' : '-1';
        this.tabIndexStep4 = currentStepNum === 4 ? '0' : '-1';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}