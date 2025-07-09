import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getSigningUrl from '@salesforce/apex/AuthentisignIntegrationController.getSigningUrl';

export default class AuthentisignContentConfig extends LightningElement {
    @api signingId = '9f3a7828-6953-f011-8f7c-000d3a8a9962'; // Hardcoded valid signingId
    @api externalId;
    signingUrl;
    error;
    isLoading = true;

    connectedCallback() {
        this.fetchSigningUrl();
    }

    fetchSigningUrl() {
        this.isLoading = true;
        this.error = undefined; // Clear previous error
        getSigningUrl({ signingId: this.signingId, externalId: this.externalId })
            .then(result => {
                this.signingUrl = result;
                this.error = undefined;
                this.isLoading = false;
                console.log('Signing URL fetched:', this.signingUrl);
            })
            .catch(error => {
                this.error = error.body?.message || 'Unknown error fetching signing URL';
                this.signingUrl = undefined;
                this.isLoading = false;
                console.error('Error fetching signing URL:', error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: this.error,
                        variant: 'error'
                    })
                );
            });
    }

    // Computed property to determine if URL is unavailable
    get isUrlUnavailable() {
        return !this.signingUrl; // True if no valid URL, false if URL is present
    }

    // Handle redirect to Authentisign interface
    handleRedirect() {
        if (this.signingUrl) {
            window.location.assign(this.signingUrl);
        } else {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'No signing URL available to redirect.',
                    variant: 'error'
                })
            );
        }
    }
}