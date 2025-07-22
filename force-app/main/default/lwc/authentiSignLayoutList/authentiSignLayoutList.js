import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getLayouts from '@salesforce/apex/LayoutListCtrl.getLayouts';
import getSettings from '@salesforce/apex/LayoutListCtrl.getSettings';
import saveAttachment from '@salesforce/apex/LayoutListCtrl.saveAttachment';
import { refreshApex } from '@salesforce/apex';
import './authentiSignLayoutList.css';

export default class AuthentiSignLayoutList extends NavigationMixin(LightningElement) {
    @api recordId;
    @api sObjectName = 'Opportunity';
    @track layouts = [];
    @track documents = [];
    @track radioOptions = [
        { label: 'Document', value: 'document' },
        { label: 'Layout', value: 'layout' }
    ];
    @track selectedOption = 'document';
    @track selectedRecord = '';
    @track savedLayoutId = '';
    @track signingStatus = '';
    @track attachmentId = '';
    @track documentAttachmentId = '';
    @track record = {};
    @track selectedDocument = '';
    @track selectedDocumentName = '';
    @track documentSigningId = '';
    @track documentSigningStatus = '';
    @track spinner = false;
    @track externalId = '';

    // Computed properties
    get isDocumentSelected() {
        return this.selectedOption === 'document';
    }

    get isDocumentSigned() {
        return this.documentSigningStatus === 'document signed';
    }

    get isLayoutSigned() {
        return this.signingStatus === 'document signed';
    }

    get startButtonClass() {
        return this.selectedRecord ? 'slds-button slds-button_brand' : 'slds-button slds-button_brand slds-hide';
    }

    get startDocumentButtonClass() {
        return this.selectedDocument ? 'slds-button slds-button_brand' : 'slds-button slds-button_brand slds-hide';
    }

    // Wire Apex call to fetch layouts
    @wire(getLayouts, { recordId: '$recordId', objectName: '$sObjectName' })
    wiredLayouts({ error, data }) {
        if (data) {
            console.log('getLayouts data:', JSON.stringify(data));
            this.populateLayoutsAndDocuments(data);
        } else if (error) {
            console.error('Error fetching layouts:', JSON.stringify(error));
            this.showToast('Error', error.body?.message || 'Unknown error', 'error');
        }
    }

    // Wire Apex call to fetch settings
    @wire(getSettings)
    wiredSettings({ error, data }) {
        if (data) {
            console.log('Settings:', JSON.stringify(data));
            this.externalId = data.externalId;
        } else if (error) {
            console.error('Error fetching settings:', JSON.stringify(error));
            this.showToast('Error', error.body?.message || 'Error fetching settings', 'error');
        }
    }

    // Populate layouts and documents
    populateLayoutsAndDocuments(result) {
        this.layouts = [{ label: 'Select Layout', value: '' }, ...result.wrapper.map(w => ({ label: w.name, value: w.id }))];
        this.selectedRecord = result.record?.[LayoutListHelper.getFieldMapping(this.sObjectName, 'Layout_Id__c', 'Layout_Id__c')] || '';
        this.savedLayoutId = result.record?.[LayoutListHelper.getFieldMapping(this.sObjectName, 'Layout_Id__c', 'Layout_Id__c')] || '';
        this.signingStatus = result.signingStatus || '';
        this.documentSigningStatus = result.documentSigningStatus || '';
        this.attachmentId = result.record?.[LayoutListHelper.getFieldMapping(this.sObjectName, 'AttachmentId__c', 'AttachmentId__c')] || '';
        this.documentAttachmentId = result.record?.[LayoutListHelper.getFieldMapping(this.sObjectName, 'Document_Attachment_Id__c', 'Document_Attachment_Id__c')] || '';
        this.record = result.record || {};

        this.documents = [{ label: 'Select Document', value: '' }, ...Object.entries(result.documents || {}).map(([value, label]) => ({ label, value }))];
        this.selectedDocument = result.record?.[LayoutListHelper.getFieldMapping(this.sObjectName, 'Document_Id__c', 'Document_Id__c')] || '';
        this.documentSigningId = result.record?.[LayoutListHelper.getFieldMapping(this.sObjectName, 'Document_Signing_Id__c', 'Document_Signing_Id__c')] || '';
    }

    // Handle radio group change
    handleChangeRadio(event) {
        this.selectedOption = event.detail.value;
    }

    // Handle layout selection change
    handleLayoutChange(event) {
        this.selectedRecord = event.detail.value;
    }

    // Handle document selection change
    handleChangeDocument(event) {
        this.selectedDocument = event.detail.value;
        const record = this.documents.find(doc => doc.value === this.selectedDocument);
        this.selectedDocumentName = record ? record.label : '';
    }

    // Handle Create New Template button click
    handleCreateTemplate() {
        this.spinner = true;
        console.log('Navigating to authentisignContentConfig with:', {
            recordId: this.recordId,
            objectName: this.sObjectName,
            signingId: '9f3a7828-6953-f011-8f7c-000d3a8a9962', // Hardcoded as per authentisignContentConfig
            externalId: this.externalId
        });
        if (!this.externalId) {
            this.spinner = false;
            this.showToast('Error', 'AuthentiSign settings (externalId) not loaded', 'error');
            return;
        }
        this[NavigationMixin.Navigate]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__authentisignContentConfig'
            },
            state: {
                c__recordId: this.recordId,
                c__objectName: this.sObjectName,
                c__signingId: '9f3a7828-6953-f011-8f7c-000d3a8a9962', // Hardcoded as per authentisignContentConfig
                c__externalId: this.externalId
            }
        }).then(() => {
            console.log('Navigation to authentisignContentConfig successful');
        }).catch(error => {
            console.error('Navigation error:', JSON.stringify(error));
            this.showToast('Error', 'Failed to navigate to AuthentiSign SSO page: ' + (error.message || 'Unknown error'), 'error');
            // Fallback to App Page
            this[NavigationMixin.Navigate]({
                type: 'standard__navItemPage',
                attributes: {
                    apiName: 'Authentisign_SSO_Page' // Replace with your App Page API name
                },
                state: {
                    c__recordId: this.recordId,
                    c__objectName: this.sObjectName,
                    c__signingId: '9f3a7828-6953-f011-8f7c-000d3a8a9962',
                    c__externalId: this.externalId
                }
            });
        }).finally(() => {
            this.spinner = false;
        });
    }

    // Navigate to mappings component
    navigateToMappings() {
        this.spinner = true;
        const layout = this.layouts.find(layout => layout.value === this.selectedRecord);
        if (!layout) {
            this.spinner = false;
            this.showToast('Error', 'Please select a layout', 'error');
            return;
        }

        // Fetch existing mappings from Opportunity
        const mappingsField = LayoutListHelper.getFieldMapping(this.sObjectName, 'Mappings__c', 'Mappings__c');
        let record;
        try {
            record = DataLayer.getRecordById(this.recordId, this.sObjectName, [mappingsField]);
        } catch (error) {
            this.spinner = false;
            this.showToast('Error', 'Failed to fetch mappings: ' + error.message, 'error');
            return;
        }

        let mappings = { fieldsMap: {}, rolesMap: {} };
        const mappingsValue = record?.get(mappingsField);
        if (mappingsValue) {
            try {
                mappings = JSON.parse(mappingsValue);
            } catch (error) {
                this.spinner = false;
                this.showToast('Error', 'Invalid mappings format in Mappings__c', 'error');
                return;
            }
        }

        // Initialize mappings for the selected layout
        if (layout) {
            layout.fields?.forEach(field => {
                if (!mappings.fieldsMap[field]) {
                    mappings.fieldsMap[field] = '';
                }
            });
            layout.roles?.forEach(role => {
                if (!mappings.rolesMap[role]) {
                    mappings.rolesMap[role] = '';
                }
            });
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__authentiSignMappingLayout'
            },
            state: {
                c__layouts: JSON.stringify(this.layouts),
                c__recordId: this.recordId,
                c__layoutId: this.selectedRecord,
                c__mappings: JSON.stringify(mappings),
                c__objectName: this.sObjectName
            }
        });
        this.spinner = false;
    }

    // Navigate to signers component
    navigateToSigners() {
        this[NavigationMixin.Navigate]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__authentiSignDocumentSigners'
            },
            state: {
                c__recordId: this.recordId,
                c__documentId: this.selectedDocument,
                c__documentName: this.selectedDocumentName,
                c__objectName: this.sObjectName
            }
        });
    }

    // Display PDF for layout
    displayPdf() {
        if (this.attachmentId) {
            window.open(`/servlet/servlet.FileDownload?file=${this.attachmentId}`, '_blank');
        } else {
            this.spinner = true;
            saveAttachment({
                recordId: this.record.Id,
                signingId: this.record[LayoutListHelper.getFieldMapping(this.sObjectName, 'Signing_Id__c', 'Signing_Id__c')] || '',
                objectName: this.sObjectName,
                isLayout: true
            })
                .then(attachmentId => {
                    this.spinner = false;
                    if (attachmentId) {
                        this.attachmentId = attachmentId;
                        this[NavigationMixin.GenerateUrl]({
                            type: 'standard__webPage',
                            attributes: {
                                url: `/servlet/servlet.FileDownload?file=${attachmentId}`
                            }
                        }).then(url => {
                            window.open(url, '_blank');
                        });
                    }
                })
                .catch(error => {
                    this.spinner = false;
                    this.showToast('Error', error.body?.message || 'Unknown error', 'error');
                });
        }
    }

    // Display PDF for document
    displayPdfDocument() {
        if (this.documentAttachmentId) {
            window.open(`/servlet/servlet.FileDownload?file=${this.documentAttachmentId}`, '_blank');
        } else {
            this.spinner = true;
            saveAttachment({
                recordId: this.record.Id,
                signingId: this.record[LayoutListHelper.getFieldMapping(this.sObjectName, 'Document_Signing_Id__c', 'Document_Signing_Id__c')] || '',
                objectName: this.sObjectName,
                isLayout: false
            })
                .then(attachmentId => {
                    this.spinner = false;
                    if (attachmentId) {
                        this.documentAttachmentId = attachmentId;
                        this[NavigationMixin.GenerateUrl]({
                            type: 'standard__webPage',
                            attributes: {
                                url: `/servlet/servlet.FileDownload?file=${attachmentId}`
                            }
                        }).then(url => {
                            window.open(url, '_blank');
                        });
                    }
                })
                .catch(error => {
                    this.spinner = false;
                    this.showToast('Error', error.body?.message || 'Unknown error', 'error');
                });
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}