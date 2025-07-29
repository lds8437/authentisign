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
    @track settingsLoaded = false;
    @track settingsError = null;
    @track error = null;
    @track showRetryButton = false;

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

    // Combined class properties with margin
    get startButtonClassWithMargin() {
        return `${this.startButtonClass} slds-m-top_small`;
    }

    get startDocumentButtonClassWithMargin() {
        return `${this.startDocumentButtonClass} slds-m-top_small`;
    }

    // Store wired result for refreshApex
    wiredLayoutsResult;

    // Wire Apex call to fetch layouts
    @wire(getLayouts, { recordId: '$recordId', objectName: '$sObjectName' })
    wiredLayouts({ error, data }) {
        this.wiredLayoutsResult = { error, data };
        if (data) {
            console.log('getLayouts data:', JSON.stringify(data, null, 2));
            this.populateLayoutsAndDocuments(data);
            this.error = null;
            this.showRetryButton = false;
        } else if (error) {
            console.error('Error fetching layouts:', JSON.stringify(error, null, 2), 'Record ID:', this.recordId, 'Object Name:', this.sObjectName);
            this.error = error.body?.message?.includes('Invalid date/time')
                ? 'Unable to load layouts due to an invalid date format in the response. Try refreshing the page, selecting the "Document" option, or contact your administrator.'
                : error.body?.message?.includes('Invalid conversion from runtime type List<ANY> to List<String>')
                ? 'Unable to load layouts due to an invalid response format. Try refreshing the page, selecting the "Document" option, or contact your administrator.'
                : error.body?.message || 'Failed to load layouts. Try refreshing the page or contact your administrator.';
            this.layouts = [{ label: 'Select Layout', value: '' }];
            this.documents = [{ label: 'Select Document', value: '' }];
            this.showRetryButton = true;
            this.showToast('Error', this.error, 'error', 'sticky');
        }
    }

    // Wire Apex call to fetch settings
    @wire(getSettings)
    wiredSettings({ error, data }) {
        if (data) {
            console.log('Settings loaded:', JSON.stringify(data, null, 2));
            this.externalId = data.externalId;
            this.settingsLoaded = true;
            this.settingsError = null;
        } else if (error) {
            console.error('Error fetching settings:', JSON.stringify(error, null, 2));
            this.settingsLoaded = false;
            this.settingsError = error.body?.message || 'Failed to load settings. Please contact your administrator.';
            this.showToast('Error', this.settingsError, 'error', 'sticky');
        }
    }

    // Retry fetching layouts
    handleRetry() {
        this.spinner = true;
        this.error = null;
        this.showRetryButton = false;
        refreshApex(this.wiredLayoutsResult)
            .then(() => {
                console.log('Retry fetch layouts successful');
                this.spinner = false;
            })
            .catch(error => {
                console.error('Retry fetch layouts failed:', JSON.stringify(error, null, 2), 'Record ID:', this.recordId, 'Object Name:', this.sObjectName);
                this.error = error.body?.message?.includes('Invalid date/time')
                    ? 'Retry failed: Invalid date format in response. Please contact your administrator.'
                    : error.body?.message?.includes('Invalid conversion from runtime type List<ANY> to List<String>')
                    ? 'Retry failed: Invalid response format. Please contact your administrator.'
                    : error.body?.message || 'Retry failed: Unable to load layouts. Please contact your administrator.';
                this.showRetryButton = true;
                this.spinner = false;
                this.showToast('Error', this.error, 'error', 'sticky');
            });
    }

    // Populate layouts and documents
    populateLayoutsAndDocuments(result) {
        this.layouts = [{ label: 'Select Layout', value: '' }, ...result.wrapper.map(w => ({ label: w.name, value: w.id }))];
        this.selectedRecord = result.record?.Layout_Id__c || '';
        this.savedLayoutId = result.record?.Layout_Id__c || '';
        this.signingStatus = result.signingStatus || '';
        this.documentSigningStatus = result.documentSigningStatus || '';
        this.attachmentId = result.record?.AttachmentId__c || '';
        this.documentAttachmentId = result.record?.Document_Attachment_Id__c || '';
        this.record = result.record || {};
        this.documents = [{ label: 'Select Document', value: '' }, ...Object.entries(result.documents || {}).map(([value, label]) => ({ label, value }))];
        this.selectedDocument = result.record?.Document_Id__c || '';
        this.documentSigningId = result.record?.Document_Signing_Id__c || '';
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
    async handleCreateTemplate() {
        this.spinner = true;
        console.log('handleCreateTemplate called with:', {
            recordId: this.recordId,
            objectName: this.sObjectName,
            signingId: '9f3a7828-6953-f011-8f7c-000d3a8a9962',
            externalId: this.externalId,
            settingsLoaded: this.settingsLoaded,
            settingsError: this.settingsError
        });

        // Validate required parameters
        if (!this.recordId || !this.sObjectName) {
            console.error('Missing required parameters:', { recordId: this.recordId, objectName: this.sObjectName });
            this.spinner = false;
            this.showToast('Error', 'Record ID or Object Name not provided', 'error', 'sticky');
            return;
        }

        // Ensure settings are loaded
        if (!this.settingsLoaded || !this.externalId) {
            console.log('Settings not loaded, attempting retry...');
            try {
                const settings = await getSettings();
                console.log('Settings fetched on retry:', JSON.stringify(settings));
                this.externalId = settings.externalId;
                this.settingsLoaded = true;
                this.settingsError = null;
            } catch (error) {
                console.error('Retry failed:', JSON.stringify(error));
                this.spinner = false;
                this.showToast('Error', 'Failed to load AuthentiSign settings: ' + (error.body?.message || 'Unknown error'), 'error', 'sticky');
                return;
            }
        }

        // Navigation state
        const navState = {
            c__recordId: this.recordId,
            c__objectName: this.sObjectName,
            c__signingId: '9f3a7828-6953-f011-8f7c-000d3a8a9962',
            c__externalId: this.externalId
        };
        console.log('Attempting navigation with state:', JSON.stringify(navState));

        // Navigate to App Page (primary target)
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'Authentisign_SSO_Page'
            },
            state: navState
        }).then(() => {
            console.log('Navigation to Authentisign_SSO_Page successful');
        }).catch(error => {
            console.error('App Page navigation error:', JSON.stringify(error));
            this.showToast('Error', 'Failed to navigate to AuthentiSign SSO page: ' + (error.message || 'Unknown error'), 'error', 'sticky');
            // Fallback to component navigation
            console.log('Falling back to authentisignContentConfig with:', JSON.stringify(navState));
            this[NavigationMixin.Navigate]({
                type: 'standard__component',
                attributes: {
                    componentName: 'c__authentisignContentConfig'
                },
                state: navState
            }).then(() => {
                console.log('Navigation to authentisignContentConfig successful');
            }).catch(fallbackError => {
                console.error('Component navigation error:', JSON.stringify(fallbackError));
                this.showToast('Error', 'Failed to navigate to AuthentiSign component: ' + (fallbackError.message || 'Unknown error'), 'error', 'sticky');
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
            this.showToast('Error', 'Please select a layout', 'error', 'sticky');
            return;
        }

        // Fetch existing mappings from Opportunity
        let mappings = { fieldsMap: {}, rolesMap: {} };
        const mappingsValue = this.record?.Mappings__c;
        if (mappingsValue) {
            try {
                mappings = JSON.parse(mappingsValue);
            } catch (error) {
                this.spinner = false;
                this.showToast('Error', 'Invalid mappings format in Mappings__c', 'error', 'sticky');
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
    async displayPdf() {
        if (this.attachmentId) {
            window.open(`/servlet/servlet.FileDownload?file=${this.attachmentId}`, '_blank');
        } else {
            this.spinner = true;
            try {
                const attachmentId = await saveAttachment({
                    recordId: this.record.Id,
                    signingId: this.record?.Signing_Id__c || '',
                    objectName: this.sObjectName,
                    isLayout: true
                });
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
            } catch (error) {
                this.spinner = false;
                this.showToast('Error', error.body?.message || 'Failed to save or display PDF', 'error', 'sticky');
            }
        }
    }

    // Display PDF for document
    async displayPdfDocument() {
        if (this.documentAttachmentId) {
            window.open(`/servlet/servlet.FileDownload?file=${this.documentAttachmentId}`, '_blank');
        } else {
            this.spinner = true;
            try {
                const attachmentId = await saveAttachment({
                    recordId: this.record.Id,
                    signingId: this.record?.Document_Signing_Id__c || '',
                    objectName: this.sObjectName,
                    isLayout: false
                });
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
            } catch (error) {
                this.spinner = false;
                this.showToast('Error', error.body?.message || 'Failed to save or display document PDF', 'error', 'sticky');
            }
        }
    }

    showToast(title, message, variant, mode = 'dismissable') {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant, mode }));
    }
}