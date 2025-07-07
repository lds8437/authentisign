import { LightningElement, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import getSObjectFields from '@salesforce/apex/TemplateBuilderController.getSObjectFields';
import getTemplates from '@salesforce/apex/TemplateBuilderController.getTemplates';
import getTemplateContent from '@salesforce/apex/TemplateBuilderController.getTemplateContent';
import saveTemplateApex from '@salesforce/apex/TemplateBuilderController.saveTemplate';
import resolveMergeFields from '@salesforce/apex/TemplateBuilderController.resolveMergeFields';
import TINYMCE from '@salesforce/resourceUrl/tinymce';
import MAMMOTH from '@salesforce/resourceUrl/mammoth';
import PDFJS from '@salesforce/resourceUrl/pdfjsLib';

export default class TemplateBuilder extends LightningElement {
  @track templateName = '';
  @track previewRecordId = '';
  @track previewHtml;
  @track selectedObject = '';
  @track selectedField = '';
  @track selectedTemplateId = '';
  @track objectOptions = [
    { label: 'Account', value: 'Account' },
    { label: 'Contact', value: 'Contact' },
    { label: 'Opportunity', value: 'Opportunity' }
  ];
  @track fieldOptions = [];
  @track templateOptions = [];

  editorInstance;
  rendered = false;

  renderedCallback() {
    if (this.rendered) return;
    this.rendered = true;

    Promise.all([
      loadScript(this, TINYMCE + '/tinymce.min.js'),
      loadScript(this, MAMMOTH + '/mammoth.browser.min.js'),
      loadScript(this, PDFJS + '/pdf.js'),
      loadScript(this, PDFJS + '/pdf.worker.js')
    ])
    .then(() => {
      tinymce.init({
        selector: '#tinymceEditor',
        height: 500,
        plugins: 'code link lists',
        toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | code',
        setup: editor => { this.editorInstance = editor; }
      });
    }).catch(console.error);

    this.loadTemplateList();
  }

  handleNameChange(e) { this.templateName = e.target.value; }
  handleRecordIdChange(e) { this.previewRecordId = e.target.value; }
  handleObjectChange(e) {
    this.selectedObject = e.detail.value;
    getSObjectFields({ sObjectName: this.selectedObject })
      .then(fields => this.fieldOptions = fields.map(f => ({ label: f, value: f })))
      .catch(console.error);
  }
  handleMergeFieldInsert(e) {
    this.selectedField = e.detail.value;
    const token = `{{!${this.selectedObject}.${this.selectedField}}}`;
    this.editorInstance.insertContent(token);
  }

  loadTemplateList() {
    getTemplates()
      .then(ts => this.templateOptions = ts.map(t => ({ label: t.Name, value: t.Id })))
      .catch(console.error);
  }
  handleTemplateSelect(e) {
    this.selectedTemplateId = e.detail.value;
    getTemplateContent({ templateId: this.selectedTemplateId })
      .then(t => {
        this.templateName = t.Name;
        this.selectedObject = t.Object__c;
        this.editorInstance.setContent(t.Body__c);
      })
      .catch(console.error);
  }

  generatePreview() {
    const html = this.editorInstance.getContent();
    resolveMergeFields({
      objectName: this.selectedObject,
      recordId: this.previewRecordId,
      templateHtml: html
    })
    .then(res => {
      this.previewHtml = res;
      this.template.querySelector('#previewContainer').innerHTML = res;
    }).catch(console.error);
  }

  saveTemplate() {
    const html = this.editorInstance.getContent();
    if (!this.templateName || !html) return alert('Enter a name and fill content before saving.');
    saveTemplateApex({
      name: this.templateName,
      htmlBody: html,
      objectName: this.selectedObject,
      fileType: 'HTML'
    })
    .then(() => alert('Template saved'))
    .catch(console.error);
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();

    if (file.type === 'application/pdf') {
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        loadingTask.promise.then(pdf => {
          let allText = '';
          const loadPage = pageNum => {
            return pdf.getPage(pageNum).then(page => {
              return page.getTextContent().then(textContent => {
                const pageText = textContent.items.map(item => item.str).join(' ');
                allText += `<p>${pageText}</p>`;
              });
            });
          };
          (async () => {
            for (let i = 1; i <= pdf.numPages; i++) {
              await loadPage(i);
            }
            this.editorInstance.setContent(allText);
          })();
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      reader.onload = async () => {
        const arrayBuffer = reader.result;
        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        this.editorInstance.setContent(result.value);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload PDF or DOCX only.');
    }
  }
  get isFieldDisabled() {
    return this.fieldOptions.length === 0;
}
}
