import { LightningElement, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllData from '@salesforce/apex/AuthentiSignMappingCtrl.getAllData';
import submitDocumentRequest from '@salesforce/apex/AuthentiSignMappingCtrl.submitDocumentRequest';

export default class AuthentiSignDocumentSigners extends NavigationMixin(LightningElement) {
    @api recordId;
    @api documentId;
    @api documentName;
    @api objectName;
    
    @track allData = {};
    @track userContactFields = [];
    @track signers = [];
    @track showMessage = false;
    @track message = '';
    @track messageType = '';
    @track messageTitle = '';
    @track spinner = false;
    
    // Getters for template
    get recordName() {
        return this.allData?.record?.Name || 'N/A';
    }

    get recordNameForSigner() {
        return this.signers.length > 0 ? this.signers[0].data?.Name || '' : '';
    }

    get recordEmailForSigner() {
        return this.signers.length > 0 ? this.signers[0].data?.Email || '' : '';
    }

    get recordTypeForSigner() {
        return this.signers.length > 0 ? this.signers[0].data?.Type || '' : '';
    }

    connectedCallback() {
        this.spinner = true;
        this.initializeComponent();
    }
    
    initializeComponent() {
        getAllData({ recordId: this.recordId, objectName: this.objectName })
            .then(result => {
                this.allData = result;
                this.populateUserContactFields();
                this.addSignerByDefault();
                this.spinner = false;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                this.showToast('Error', error.body?.message || 'Unknown error', 'error');
                this.spinner = false;
            });
    }
    
    populateUserContactFields() {
        this.userContactFields = [{ label: '--Select--', value: '' }];
        Object.keys(this.allData.userContactFieldMap || {}).forEach(fieldName => {
            this.userContactFields.push({
                label: this.allData.recordFieldProps[fieldName]?.label || fieldName,
                value: fieldName,
                lookupName: this.allData.userContactFieldMap[fieldName]
            });
        });
        this.userContactFields.sort((a, b) => a.label.localeCompare(b.label));
    }
    
    addSignerByDefault() {
        const fieldName = this.objectName.toLowerCase() === 'sbqq__quote__c' ? 'SBQQ__PrimaryContact__c' : 'ContactId';
        const lookupField = this.allData.userContactFieldMap?.[fieldName];
        const quoteRecord = this.allData.record?.[lookupField];
        
        const signer = { data: { Role: 'Signer 1' }, value: fieldName };
        if (quoteRecord) {
            signer.data = { ...quoteRecord };
            const participantFields = this.allData.participantFields?.[lookupField] || [];
            let objectType = participantFields[participantFields.length - 1] || '';
            objectType = objectType.replace('(', '').replace(')', '');
            objectType = objectType.includes('User') ? 'User' : objectType;
            signer.data.Type = objectType;
        } else {
            signer.data = { Role: 'Signer 1', Name: '', Email: '', FirstName: '', Id: '', LastName: '', Type: '' };
        }
        this.signers = [signer];
        
        setTimeout(() => {
            const combobox = this.template.querySelector('[name="ddlUserContact-0"]');
            if (combobox) combobox.value = fieldName;
        }, 100);
    }
    
    getRoleName(event) {
        return `txtRole-${event.target.dataset.index}`;
    }
    
    getUserContactName(event) {
        return `ddlUserContact-${event.target.dataset.index}`;
    }
    
    getDeleteName(event) {
        return `btnDelete-${event.target.dataset.index}`;
    }
    
    handleRoleChange(event) {
        const index = event.target.dataset.index;
        this.signers[index].data.Role = event.target.value;
        this.signers = [...this.signers];
    }
    
    handleUserContactChange(event) {
        const index = event.target.dataset.index;
        const fieldName = event.target.value;
        const lookupField = this.allData.userContactFieldMap?.[fieldName];
        const quoteRecord = this.allData.record?.[lookupField];
        
        const signer = this.signers[index];
        if (quoteRecord) {
            signer.data = { ...quoteRecord, Role: signer.data.Role };
            const participantFields = this.allData.participantFields?.[lookupField] || [];
            let objectType = participantFields[participantFields.length - 1] || '';
            objectType = objectType.replace('(', '').replace(')', '');
            objectType = objectType.includes('User') ? 'User' : objectType;
            signer.data.Type = objectType;
        } else {
            signer.data = { Role: signer.data.Role, Name: '', Email: '', FirstName: '', Id: '', LastName: '', Type: '' };
        }
        signer.value = fieldName;
        this.signers = [...this.signers];
    }
    
    addSigner() {
        this.signers = [...this.signers, {
            data: { Role: `Signer ${this.signers.length + 1}`, Name: '', Email: '', FirstName: '', Id: '', LastName: '', Type: '' },
            value: ''
        }];
    }
    
    deleteSigner(event) {
        const index = event.target.dataset.index;
        this.signers.splice(index, 1);
        this.signers = [...this.signers];
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
    
    createRequest() {
        this.spinner = true;
        let errorMessage = '';
        if (this.signers.length === 0) {
            errorMessage = 'No signer added, please add signers.';
        } else {
            this.signers.forEach(signer => {
                if (!signer.data.Id) {
                    errorMessage += 'Please select valid User/Contact\n';
                }
                if (!signer.data.Role) {
                    errorMessage += 'Please add the role of signer\n';
                }
            });
        }
        
        if (errorMessage) {
            this.spinner = false;
            this.showToast('Error', errorMessage, 'error');
            return;
        }
        
        const signersRequest = this.signers.map(signer => ({
            data: {
                Role: signer.data.Role,
                FirstName: signer.data.FirstName || '',
                LastName: signer.data.LastName || '',
                Email: signer.data.Email || '',
                Type: signer.data.Type || ''
            }
        }));
        
        submitDocumentRequest({
            recordId: this.recordId,
            objectName: this.objectName,
            documentId: this.documentId,
            documentName: this.documentName,
            quoteName: this.recordName,
            signers: signersRequest
        })
            .then(data => {
                this.spinner = false;
                this.showToast('Success', 'Signing submitted successfully.', 'success');
                setTimeout(() => this.handleBack(), 2000);
            })
            .catch(error => {
                this.spinner = false;
                this.showToast('Error', error.body?.message || 'Unknown error', 'error');
            });
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}