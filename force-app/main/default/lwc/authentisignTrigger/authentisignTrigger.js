import { LightningElement, api } from 'lwc';

export default class AuthentisignTrigger extends LightningElement {
    @api recordId; // Record ID from Salesforce context
    @api objectName; // Object API name
    @api signingId; // Optional signing ID
    @api externalId; // Optional external ID
    isModalOpen = false; // Controls modal visibility
    nameInput = ''; // Stores the Name input value

    // Open the modal and dispatch event to trigger redirect
    openModal() {
        this.isModalOpen = true;
        console.log('Opened Authentisign modal');
        // Dispatch custom event to trigger redirect in authentisignContentConfig
        const autoRedirectEvent = new CustomEvent('autoredirect', { bubbles: true, composed: true });
        this.dispatchEvent(autoRedirectEvent);
    }

    // Close the modal
    closeModal() {
        this.isModalOpen = false;
        console.log('Closed Authentisign modal');
    }

    // Handle Name input change
    handleNameChange(event) {
        this.nameInput = event.target.value;
        console.log('Name input updated:', this.nameInput);
    }

    // Handle the autoredirect event (for debugging or future use)
    handleAutoRedirect(event) {
        console.log('Auto-redirect event received in authentisignTrigger');
    }
}