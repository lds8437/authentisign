import { LightningElement, api } from 'lwc';
import getAvailableFields from '@salesforce/apex/AuthentisignWizardController.getAvailableFields';
import saveFieldMappings from '@salesforce/apex/AuthentisignWizardController.saveFieldMappings';

export default class FieldMappingStep extends LightningElement {
    @api configId;
    objectFields = {};
    mappings = {};
    error;

    connectedCallback() {
        getAvailableFields()
            .then(result => {
                this.objectFields = result;
            })
            .catch(error => {
                this.error = error.body.message;
            });
    }

    handleMappingChange(event) {
        this.mappings[event.detail.object] = event.detail.field;
    }

    handleSaveMappings() {
        saveFieldMappings({ 
            configId: this.configId, 
            mappingsJson: JSON.stringify(this.mappings) 
        })
            .then(() => {
                this.dispatchEvent(new CustomEvent('fieldmappingselect', {
                    detail: { mappings: this.mappings }
                }));
            })
            .catch(error => {
                this.error = error.body.message;
            });
    }
}