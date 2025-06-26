import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getObjectFields from '@salesforce/apex/AuthentisignWizardController.getObjectFields';

export default class MergeFieldMapping extends LightningElement {
    @api configId;
    @api recordId;
    @track mergeFields = [];
    @track objectOptions = [{ label: 'Opportunity', value: 'Opportunity' }];
    @track fieldOptions = [];
    @track selectedObject = '';
    @track selectedField = '';
    @track fieldName = '';
    @track isModalOpen = false;
    @track isLoading = false;
    @track error = '';
    @track isEditMode = false;
    @track editFieldId = '';

    columns = [
        { label: 'Name', fieldName: 'name', type: 'text' },
        { label: 'Source Object', fieldName: 'object', type: 'text' },
        { label: 'Field', fieldName: 'field', type: 'text' },
        {
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'Edit', name: 'edit' },
                    { label: 'Delete', name: 'delete' }
                ]
            }
        }
    ];

    get isFieldDisabled() {
        return this.fieldOptions.length === 0;
    }

    get modalTitle() {
        return this.isEditMode ? 'Edit Merge Field' : 'Add Merge Field';
    }

        // Computed property for Save button disabled state
    get isSaveDisabled() {
        return this.mergeFields.length === 0;
    }

    connectedCallback() {
        console.log('mergeFieldMapping: connectedCallback, configId=', this.configId, 'recordId=', this.recordId);
    }

    handleAddField() {
        this.isModalOpen = true;
        this.isEditMode = false;
        this.selectedObject = 'Opportunity';
        this.selectedField = '';
        this.fieldName = '';
        this.fieldOptions = [];
        this.error = '';
        this.fetchFields();
        console.log('handleAddField: Modal opened, defaulted to Opportunity');
    }

    async fetchFields() {
        if (this.selectedObject) {
            this.isLoading = true;
            try {
                const fields = await getObjectFields({ objectName: this.selectedObject });
                this.fieldOptions = fields.map(field => ({
                    label: field.label,
                    value: field.apiName
                }));
                console.log('fetchFields: fieldOptions=', JSON.stringify(this.fieldOptions));
            } catch (error) {
                this.error = error.body?.message || 'Error retrieving fields';
                this.showToast('Error', this.error, 'error');
                console.log('fetchFields error:', JSON.stringify(error));
            }
            this.isLoading = false;
        }
    }

    async handleObjectChange(event) {
        this.selectedObject = event.detail.value;
        this.selectedField = '';
        this.fieldName = '';
        this.fieldOptions = [];
        this.error = '';
        console.log('handleObjectChange: selectedObject=', this.selectedObject);
        await this.fetchFields();
    }

    handleFieldChange(event) {
        this.selectedField = event.detail.value;
        const field = this.fieldOptions.find(f => f.value === this.selectedField);
        this.fieldName = this.selectedObject && field ? `${this.selectedObject}.${field.label}` : '';
        this.error = '';
        console.log('handleFieldChange: selectedField=', this.selectedField, 'fieldName=', this.fieldName);
    }

    handleNameChange(event) {
        this.fieldName = event.detail.value;
        this.error = '';
        console.log('handleNameChange: fieldName=', this.fieldName);
    }

    handleSave() {
        if (!this.selectedObject || !this.selectedField || !this.fieldName) {
            this.error = 'Please select an object, a field, and provide a valid name.';
            this.showToast('Error', this.error, 'error');
            console.log('handleSave: Validation failed');
            return;
        }

        const field = {
            id: this.isEditMode ? this.editFieldId : Date.now().toString(),
            name: this.fieldName,
            object: this.selectedObject,
            field: this.selectedField
        };

        if (this.isEditMode) {
            const index = this.mergeFields.findIndex(f => f.id === this.editFieldId);
            if (index !== -1) {
                this.mergeFields[index] = field;
            }
        } else {
            this.mergeFields = [...this.mergeFields, field];
        }

        console.log('handleSave: mergeFields=', JSON.stringify(this.mergeFields));
        this.dispatchEvent(new CustomEvent('fieldmapping', {
            detail: { mergeFields: this.mergeFields },
            bubbles: true,
            composed: true
        }));
        this.showToast('Success', `Merge field ${this.isEditMode ? 'updated' : 'added'} successfully`, 'success');
        this.closeModal();
    }

    handleSaveAll() {
        console.log('handleSaveAll: Saving all mergeFields=', JSON.stringify(this.mergeFields));
        this.dispatchEvent(new CustomEvent('fieldmapping', {
            detail: { mergeFields: this.mergeFields },
            bubbles: true,
            composed: true
        }));
        this.showToast('Success', 'All merge fields saved successfully', 'success');
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        console.log('handleRowAction: action=', actionName, 'row=', JSON.stringify(row));

        if (actionName === 'delete') {
            this.mergeFields = this.mergeFields.filter(f => f.id !== row.id);
            this.dispatchEvent(new CustomEvent('fieldmapping', {
                detail: { mergeFields: this.mergeFields },
                bubbles: true,
                composed: true
            }));
            this.showToast('Success', 'Merge field deleted successfully', 'success');
        } else if (actionName === 'edit') {
            this.isEditMode = true;
            this.editFieldId = row.id;
            this.selectedObject = row.object;
            this.selectedField = row.field;
            this.fieldName = row.name;
            this.isModalOpen = true;
            this.fetchFields();
            console.log('handleRowAction: Edit mode, field=', JSON.stringify(row));
        }
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedObject = '';
        this.selectedField = '';
        this.fieldName = '';
        this.error = '';
        this.isEditMode = false;
        this.editFieldId = '';
        this.fieldOptions = [];
        console.log('closeModal: Modal closed');
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({ title, message, variant });
        this.dispatchEvent(event);
    }
}