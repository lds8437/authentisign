public with sharing class AuthentisignApiService {
    private static final String NAMED_CREDENTIAL = 'AuthentisignAPI';
    
    public class DocumentResponse {
        public String documentId;
    }

    public static DocumentResponse uploadDocument(Blob documentData, String title) {
        System.debug('AuthentisignApiService.uploadDocument: Endpoint=callout:AuthentisignAPI, Title=' + title);
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:AuthentisignAPI');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'multipart/form-data; boundary=----WebKitFormBoundary');
        req.setBodyAsBlob(documentData);
        Http http = new Http();
        try {
            HttpResponse res = http.send(req);
            System.debug('Response Status: ' + res.getStatusCode() + ', Body: ' + res.getBody());
            if (res.getStatusCode() == 200) {
                DocumentResponse response = (DocumentResponse) JSON.deserialize(res.getBody(), DocumentResponse.class);
                return response;
            } else {
                throw new CalloutException('Failed to upload document: ' + res.getStatus());
            }
        } catch (Exception e) {
            System.debug('Callout Error: ' + e.getMessage());
            throw e;
        }
    }
    
    public static void addRecipients(String configId, List<AuthentisignWizardController.Recipient> recipients) {
        System.debug('AuthentisignApiService.addRecipients: ConfigId=' + configId + ', Recipients=' + JSON.serialize(recipients));
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:AuthentisignAPI/recipients');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setBody(JSON.serialize(recipients));
        Http http = new Http();
        try {
            HttpResponse res = http.send(req);
            System.debug('Response Status: ' + res.getStatusCode() + ', Body: ' + res.getBody());
            if (res.getStatusCode() != 200) {
                throw new CalloutException('Failed to add recipients: ' + res.getStatus() + ', Body: ' + res.getBody());
            }
        } catch (Exception e) {
            System.debug('Callout Error: ' + e.getMessage());
            throw e;
        }
    }
    
    public static void placeFields(String documentId, List<AuthentisignWizardController.FieldPosition> fields) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + NAMED_CREDENTIAL + '/documents/' + documentId + '/fields');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setBody(JSON.serialize(fields));
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() != 200) {
            throw new CalloutException('Error placing fields: ' + res.getBody());
        }
    }
    
    public static void sendDocument(String documentId) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + NAMED_CREDENTIAL + '/documents/' + documentId + '/send');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() != 200) {
            throw new CalloutException('Error sending document: ' + res.getBody());
        }
    }
}