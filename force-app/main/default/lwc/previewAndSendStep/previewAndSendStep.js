import { LightningElement, api } from 'lwc';
import getPreviewData from '@salesforce/apex/AuthentisignWizardController.getPreviewData';
import sendDocument from '@salesforce/apex/AuthentisignWizardController.sendDocument';

export default class PreviewAndSendStep extends LightningElement {
    @api configId;
    previewData;
    error;

    connectedCallback() {
        getPreviewData({ configId: this.configId })
            .then(result => {
                this.previewData = result;
            })
            .catch(error => {
                this.error = error.body.message;
            });
    }

    handleSend() {
        sendDocument({ configId: this.configId })
            .then(() => {
                this.dispatchEvent(new CustomEvent('documentsent'));
            })
            .catch(error => {
                this.error = error.body.message;
            });
    }
}