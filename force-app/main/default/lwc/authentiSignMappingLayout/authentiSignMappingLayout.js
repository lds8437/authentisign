import { LightningElement, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllData from '@salesforce/apex/AuthentiSignMappingCtrl.getAllData';
import fillAndSubmit from '@salesforce/apex/AuthentiSignMappingCtrl.fillAndSubmit';
import getFieldMapping from '@salesforce/apex/LayoutListHelper.getFieldMapping';

export default class AuthentiSignMappingLayout extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectName;
    @api layouts;
    @api layoutId;
    @api mappings;
    
    @track fields = [];
    @track selectedLayout = {};
    @track roles = [];
    @track recordFields = [];
    @track userContactFields = [];
    @track allData = {};
    @track expirationDate = '';
    @track spinner = false;
    
    // Getters for template
    get recordName() {
        return this.allData?.record?.Name || 'N/A';
    }

    async connectedCallback() {
        this.spinner = true;
        try {
            await this.initializeComponent();
        } catch (error) {
            console.error('Error in connectedCallback:', error);
            this.showToast('Error', 'Failed to initialize component: ' + error.message, 'error');
            this.spinner = false;
        }
    }
    
    async initializeComponent() {
        console.log('Initializing component with recordId:', this.recordId, 'objectName:', this.objectName, 'layoutId:', this.layoutId);
        this.selectedLayout = this.layouts?.find(x => x.id === this.layoutId) || {};
        if (this.selectedLayout?.fields) {
            this.fields = this.selectedLayout.fields.map(field => ({
                name: field,
                field: '',
                value: ''
            }));
        }
        if (this.selectedLayout?.layoutParticipants) {
            this.roles = this.selectedLayout.layoutParticipants.map(part => ({
                name: part.role,
                value: part.role,
                data: {}
            }));
        }
        
        try {
            const result = await getAllData({ recordId: this.recordId, objectName: this.objectName });
            this.allData = result;
            console.log('allData:', JSON.stringify(this.allData));
            console.log('fields:', JSON.stringify(this.fields));
            console.log('roles:', JSON.stringify(this.roles));
            await this.populateFields();
            if (this.mappings) {
                setTimeout(() => this.populateFieldsValue(this.mappings), 500);
            }
            this.spinner = false;
        } catch (error) {
            console.error('Error fetching data from getAllData:', error);
            this.showToast('Error', 'Failed to fetch data: ' + error.message, 'error');
            this.spinner = false;
        }
    }
    
    async populateFields() {
        // Record Fields
        this.recordFields = [{ label: '--Select--', value: '' }];
        Object.keys(this.allData.recordFieldProps || {}).forEach(fieldName => {
            const fieldProps = this.allData.recordFieldProps[fieldName];
            this.recordFields.push({ label: fieldProps.label, value: fieldName });
            if (fieldProps.type.includes('REFERENCE')) {
                const lookupFieldName = fieldProps.custom === 'true' ? 
                    fieldName.replace('__c', '__r') : 
                    fieldName.replace('Id', '').replace('id', '');
                this.recordFields.push({ label: `${fieldProps.label} > Name`, value: lookupFieldName });
            }
        });
        this.recordFields.sort((a, b) => a.label.localeCompare(b.label));
        
        // User/Contact Fields
        this.userContactFields = [{ label: '--Select--', value: '' }];
        Object.keys(this.allData.userContactFieldMap || {}).forEach(fieldName => {
            this.userContactFields.push({
                label: this.allData.recordFieldProps[fieldName]?.label || fieldName,
                value: fieldName,
                lookupName: this.allData.userContactFieldMap[fieldName]
            });
        });
        this.userContactFields.sort((a, b) => a.label.localeCompare(b.label));
        
        // Expiration Date
        try {
            const expirationField = await getFieldMapping({
                objectName: this.objectName,
                fieldName: 'ExpirationDate',
                defaultFieldName: 'ExpirationDate'
            });
            this.expirationDate = this.allData.record?.[expirationField] || '';
        } catch (error) {
            console.error('Error fetching expiration field mapping:', error);
            this.showToast('Error', 'Failed to fetch expiration field mapping: ' + error.message, 'error');
        }
    }
    
    populateFieldsValue(mappings) {
        try {
            const objMappings = JSON.parse(mappings);
            this.fields.forEach((field, index) => {
                const mapping = objMappings.fieldsMap[field.name];
                if (mapping) {
                    field.field = mapping.field;
                    this.handleQuoteFieldChange({ target: { dataset: { index }, value: mapping.field } });
                }
            });
            
            Object.keys(objMappings.rolesMap || {}).forEach(key => {
                const role = this.roles.find(r => r.name === key);
                if (role) {
                    role.value = objMappings.rolesMap[key];
                    this.handleUserContactChange({ target: { dataset: { index: this.roles.indexOf(role) }, value: role.value } });
                }
            });
        } catch (error) {
            console.error('Error in populateFieldsValue:', error);
            this.showToast('Error', 'Failed to populate field values: ' + error.message, 'error');
        }
    }
    
    handleExpirationDateChange(event) {
        this.expirationDate = event.target.value;
    }
    
    handleQuoteFieldChange(event) {
        const index = event.target.dataset.index;
        const value = event.target.value;
        this.fields[index].field = value;
        const txtControl = this.template.querySelector(`[data-index="${index}"][name="txtQuoteFieldValue"]`);
        let txtControlValue = this.allData.record?.[value];
        if (typeof txtControlValue === 'object' && txtControlValue) {
            txtControlValue = txtControlValue.Name || '';
        }
        txtControl.value = txtControlValue || '';
        this.fields[index].value = txtControlValue || '';
        this.fields = [...this.fields]; // Trigger reactivity
    }
    
    handleUserContactChange(event) {
        const index = event.target.dataset.index;
        const fieldName = event.target.value;
        const lookupField = this.allData.userContactFieldMap?.[fieldName];
        const quoteRecord = this.allData.record?.[lookupField];
        
        const role = this.roles[index];
        if (quoteRecord) {
            role.data = { ...quoteRecord };
            const participantFields = this.allData.participantFields?.[lookupField] || [];
            let objectType = participantFields[participantFields.length - 1] || '';
            objectType = objectType.replace('(', '').replace(')', '');
            objectType = objectType.includes('User') ? 'User' : objectType;
            role.data.Type = objectType;
        } else {
            role.data = { Name: '', Email: '', FirstName: '', Id: '', LastName: '', Type: '' };
        }
        role.value = fieldName;
        this.roles = [...this.roles]; // Trigger reactivity
    }
    
    handleBack() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: this.objectName,
                actionName: 'view'
            }
        });
    }
    
    async createRequest() {
        this.spinner = true;
        const errors = [];
        
        if (!this.expirationDate) {
            errors.push('Expiration date is not provided');
        }
        
        const hasUserContact = this.roles.some(role => role.value);
        if (!hasUserContact) {
            errors.push('Please select user/contact value in participants');
        }
        
        if (errors.length > 0) {
            this.spinner = false;
            this.showToast('Error', errors.join('\n'), 'error');
            return;
        }
        
        const objFields = {};
        const objFieldsMap = {};
        this.fields.forEach(field => {
            const txtControl = this.template.querySelector(`[data-index="${this.fields.indexOf(field)}"][name="txtQuoteFieldValue"]`);
            objFields[field.name] = txtControl?.value || '';
            objFieldsMap[field.name] = { object: 'record', field: field.field };
        });
        
        const requestParticipants = this.roles
            .filter(role => role.data?.LastName && role.data?.Email)
            .map(role => ({
                firstname: role.data.FirstName || '',
                middlename: '',
                lastname: role.data.LastName || '',
                email: role.data.Email || '',
                type: 0,
                participantRole: role.name,
                staticSignatureEnabled: true,
                scriptedSignatureEnabled: true,
                imageSignatureEnabled: true
            }));
        
        const rolesMap = {};
        this.roles.forEach(role => {
            rolesMap[role.name] = role.value;
        });
        
        const finalObj = {
            name: this.recordName,
            isOrdered: false,
            expirationDate: this.expirationDate ? `${this.expirationDate}T00:00:00.000Z` : '',
            callbackUrl: '##callbackurl##',
            layoutId: this.layoutId,
            fields: objFields,
            participants: requestParticipants
        };
        
        const mappings = { fieldsMap: objFieldsMap, rolesMap };
        
        try {
            const result = await fillAndSubmit({
                requestString: JSON.stringify(finalObj),
                recordId: this.allData.record?.Id,
                layoutId: this.layoutId,
                mappings: JSON.stringify(mappings),
                objectName: this.objectName
            });
            this.spinner = false;
            if (result) {
                this.showToast('Success', 'Signing submitted successfully.', 'success');
                setTimeout(() => this.handleBack(), 2000);
            } else {
                this.showToast('Error', 'Something went wrong, please contact System Administrator.', 'error');
            }
        } catch (error) {
            console.error('Error in fillAndSubmit:', error);
            this.spinner = false;
            this.showToast('Error', 'Failed to submit signing request: ' + error.message, 'error');
        }
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}