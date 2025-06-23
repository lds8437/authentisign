import { LightningElement, api } from 'lwc';
import placeFields from '@salesforce/apex/AuthentisignWizardController.placeFields';

export default class DragAndDropStep extends LightningElement {
    @api configId;
    fields = [];
    error;

    handleFieldDrop(event) {
        this.fields.push({
            fieldName: event.detail.field,
            x: event.detail.x,
            y: event.detail.y
        });
    }

    handleSaveFields() {
        placeFields({ 
            configId: this.configId, 
            fieldsJson: JSON.stringify(this.fields) 
        })
            .then(() => {
                this.dispatchEvent(new CustomEvent('fieldplacement', {
                    detail: { fields: this.fields }
                }));
            })
            .catch(error => {
                this.error = error.body.message;
            });
    }
}