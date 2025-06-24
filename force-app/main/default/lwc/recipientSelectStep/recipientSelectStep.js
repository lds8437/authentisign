import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAvailableRecipients from '@salesforce/apex/AuthentisignWizardController.getAvailableRecipients';
import addRecipientsToAuthentisign from '@salesforce/apex/AuthentisignWizardController.addRecipientsToAuthentisign';

export default class RecipientSelectStep extends LightningElement {
    @api recordId;
    @api configId;
    @api documentId;
    @api externalDocId;
    @api documentTitle;
    @track objectType = '';
    @track recipients = [];
    @track selectedRecipients = [];
    @track selectedRecipientIds = [];
    @track error;

    connectedCallback() {
        console.log('recipientSelectStep: connectedCallback, documentTitle=', this.documentTitle);
    }

    // Reactive setter to log documentTitle changes
    set documentTitle(value) {
        this._documentTitle = value;
        console.log('recipientSelectStep: documentTitle updated=', value);
    }

    get documentTitle() {
        return this._documentTitle;
    }

    objectTypeOptions = [
        { label: 'Contact', value: 'Contact' },
        { label: 'Lead', value: 'Lead' }
    ];

    columns = [
        { label: 'Name', fieldName: 'name', type: 'text' },
        { label: 'Email', fieldName: 'email', type: 'email' },
        {
            label: 'Role',
            fieldName: 'role',
            type: 'picklist',
            typeAttributes: {
                options: [
                    { label: 'Signer', value: 'Signer' },
                    { label: 'Buyer', value: 'Buyer' }
                ],
                value: { fieldName: 'role' },
                context: { fieldName: 'id' }
            },
            editable: true
        },
        {
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'Remove', name: 'remove' }
                ]
            }
        }
    ];

    get recipientOptions() {
        console.log('recipientOptions: recipients=', JSON.stringify(this.recipients));
        const options = this.recipients.map(rec => ({
            label: `${rec.name ? rec.name : 'Unknown'} (${rec.email ? rec.email : 'No Email'})`,
            value: rec.id ? rec.id : ''
        }));
        console.log('recipientOptions: options=', JSON.stringify(options));
        return options;
    }

    get isRecipientComboboxDisabled() {
        return !this.objectType || this.recipients.length === 0;
    }

    get isConfirmDisabled() {
        return this.selectedRecipients.length === 0;
    }

    handleObjectTypeChange(event) {
        this.objectType = event.detail.value;
        this.recipients = [];
        this.selectedRecipients = [];
        this.selectedRecipientIds = [];
        this.error = null;
        console.log('handleObjectTypeChange: objectType=', this.objectType, 'recordId=', this.recordId);
        if (this.objectType) {
            this.fetchRecipients();
        }
    }

    fetchRecipients() {
        console.log('fetchRecipients: objectType=', this.objectType, 'recordId=', this.recordId);
        getAvailableRecipients({ recordId: this.recordId, objectType: this.objectType })
            .then(result => {
                console.log('fetchRecipients: raw result=', JSON.stringify(result));
                this.recipients = Array.isArray(result) ? result : [];
                console.log('fetchRecipients: recipients set=', JSON.stringify(this.recipients));
                if (this.recipients.length === 0) {
                    this.error = `No ${this.objectType} records found with valid emails.`;
                    this.showToast('Warning', this.error, 'warning');
                }
                this.error = null;
            })
            .catch(error => {
                this.error = error.body?.message || `Error fetching ${this.objectType} recipients`;
                console.log('fetchRecipients error:', JSON.stringify(error));
                this.showToast('Error', this.error, 'error');
            });
    }

    handleRecipientSelect(event) {
        const selectedIds = event.detail.value;
        this.selectedRecipientIds = selectedIds;
        this.selectedRecipients = this.recipients
            .filter(rec => selectedIds.includes(rec.id))
            .map(rec => ({
                id: rec.id,
                name: rec.name || 'Unknown',
                email: rec.email || 'No Email',
                role: 'Signer' // Default role
            }));
        this.error = null;
        console.log('handleRecipientSelect: selectedRecipients=', JSON.stringify(this.selectedRecipients));
    }

    handleCellChange(event) {
        const draftValues = event.detail.draftValues;
        this.selectedRecipients = this.selectedRecipients.map(rec => {
            const draft = draftValues.find(d => d.id === rec.id);
            return draft ? { ...rec, role: draft.role } : rec;
        });
        console.log('handleCellChange: updated selectedRecipients=', JSON.stringify(this.selectedRecipients));
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'remove') {
            this.selectedRecipients = this.selectedRecipients.filter(rec => rec.id !== row.id);
            this.selectedRecipientIds = this.selectedRecipientIds.filter(id => id !== row.id);
            this.error = null;
            console.log('handleRowAction: removed id=', row.id, 'selectedRecipients=', JSON.stringify(this.selectedRecipients));
        }
    }

    handleSaveRecipients() {
        if (this.selectedRecipients.length > 0) {
            addRecipientsToAuthentisign({ 
                configId: this.configId, 
                recipientsJson: JSON.stringify(this.selectedRecipients) 
            })
                .then(() => {
                    this.dispatchEvent(new CustomEvent('recipientselect', {
                        detail: { recipients: this.selectedRecipients },
                        bubbles: true,
                        composed: true
                    }));
                    this.showToast('Success', 'Recipients saved successfully', 'success');
                })
                .catch(error => {
                    this.error = error.body?.message || 'Error saving recipients';
                    this.showToast('Error', this.error, 'error');
                });
        } else {
            this.error = 'Please select at least one recipient.';
            this.showToast('Error', this.error, 'error');
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