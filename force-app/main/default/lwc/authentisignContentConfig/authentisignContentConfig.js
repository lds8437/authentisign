import { LightningElement, api, wire } from 'lwc';
import getSigningUrl from '@salesforce/apex/AuthentisignIntegrationController.getSigningUrl';

export default class AuthentisignContentConfig extends LightningElement {
    @api signingId = '9f3a7828-6953-f011-8f7c-000d3a8a9962';
    @api externalId = 'cd5150af-1965-47c5-ad2c-4b79546937c3';
    signingUrl;
    error;

    connectedCallback() {
        this.fetchSigningUrl();
    }

    fetchSigningUrl() {
        getSigningUrl({ signingId: this.signingId, externalId: this.externalId })
            .then(result => {
                this.signingUrl = result;
                this.error = undefined;
                console.log('Signing URL:', this.signingUrl);
            })
            .catch(error => {
                this.error = error.body.message;
                this.signingUrl = undefined;
                console.error('Error fetching signing URL:', error);
            });
    }
}