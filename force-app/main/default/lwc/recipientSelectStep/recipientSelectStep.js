import { LightningElement, api } from 'lwc';
import getAvailableRecipients from '@salesforce/apex/AuthentisignWizardController.getAvailableRecipients';
import addRecipientsToAuthentisign from '@salesforce/apex/AuthentisignWizardController.addRecipientsToAuthentisign';

export default class RecipientSelectStep extends LightningElement {
    @api recordId; // Parent record ID
    @api configId;
    recipients = [];
    selectedRecipients = [];
    error;

    connectedCallback() {
        getAvailableRecipients({ recordId: this.recordId })
            .then(result => {
                this.recipients = result;
            })
            .catch(error => {
                this.error = error.body.message;
            });
    }

    handleRecipientSelect(event) {
        this.selectedRecipients = event.detail.value.map(rec => ({
            id: rec.id,
            name: rec.name,
            email: rec.email,
            role: 'Signer' // Default role
        }));
    }

    handleSaveRecipients() {
        if (this.selectedRecipients.length > 0) {
            addRecipientsToAuthentisign({ 
                configId: this.configId, 
                recipientsJson: JSON.stringify(this.selectedRecipients) 
            })
                .then(() => {
                    this.dispatchEvent(new CustomEvent('recipientselect', {
                        detail: { recipients: this.selectedRecipients }
                    }));
                })
                .catch(error => {
                    this.error = error.body.message;
                });
        }
    }
}