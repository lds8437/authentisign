import { LightningElement, api } from 'lwc';

export default class PlaceFieldsStep extends LightningElement {
    @api configId;
    @api recordId;
    @api documentId;
    @api mergeFields;

    connectedCallback() {
        console.log('placeFieldsStep: connectedCallback, configId=', this.configId, 'recordId=', this.recordId, 'documentId=', this.documentId, 'mergeFields=', JSON.stringify(this.mergeFields));
    }
}