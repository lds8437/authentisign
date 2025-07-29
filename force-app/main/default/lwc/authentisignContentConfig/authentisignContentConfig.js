import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getSigningUrl from '@salesforce/apex/AuthentisignIntegrationController.getSigningUrl';

export default class AuthentisignContentConfig extends LightningElement {
    @api recordId;
    @api objectName;
    @api signingId;
    @api externalId;
    signingUrl;
    error;
    isLoading = true;

    connectedCallback() {
        this.signingId = this.signingId || '9f3a7828-6953-f011-8f7c-000d3a8a9962'; // Fallback if not provided
        this.fetchSigningUrl();
        // Listen for the autoredirect event
        this.template.addEventListener('autoredirect', this.handleAutoRedirect.bind(this));
    }

    fetchSigningUrl() {
        this.isLoading = true;
        this.error = undefined; // Clear previous error
        console.log('Fetching signing URL with:', {
            signingId: this.signingId,
            externalId: this.externalId,
            recordId: this.recordId,
            objectName: this.objectName
        });
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

    // Handle redirect to Authentisign interface in a new tab
    handleRedirect() {
        if (this.signingUrl) {
            window.open(this.signingUrl, '_blank'); // Open URL in new tab
            console.log('Opened SSO URL in new tab:', this.signingUrl);
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

    // Handle the autoredirect event to trigger redirect automatically
    handleAutoRedirect() {
        console.log('Auto-redirect event received, attempting redirect');
        if (this.signingUrl) {
            this.handleRedirect();
        } else {
            // Wait for signingUrl to be available (in case fetch is still in progress)
            const checkUrl = setInterval(() => {
                if (this.signingUrl) {
                    clearInterval(checkUrl);
                    this.handleRedirect();
                } else if (this.error) {
                    clearInterval(checkUrl);
                    console.error('Cannot auto-redirect due to error:', this.error);
                }
            }, 100);
        }
    }
}