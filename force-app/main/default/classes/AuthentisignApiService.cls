public with sharing class AuthentisignApiService {
    private static final String NAMED_CREDENTIAL = 'AuthentisignAPI';
    
    public class DocumentResponse {
        public String documentId;
    }
    
    public static DocumentResponse uploadDocument(Blob fileData, String fileName) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + NAMED_CREDENTIAL + '/documents');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'multipart/form-data; boundary=----WebKitFormBoundary');
        String body = '------WebKitFormBoundary\r\n' +
                      'Content-Disposition: form-data; name="file"; filename="' + fileName + '"\r\n' +
                      'Content-Type: application/pdf\r\n\r\n' +
                      EncodingUtil.base64Encode(fileData) + '\r\n' +
                      '------WebKitFormBoundary--';
        req.setBody(body);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 201) {
            return (DocumentResponse) JSON.deserialize(res.getBody(), DocumentResponse.class);
        } else {
            throw new CalloutException('Error uploading document: ' + res.getBody());
        }
    }
    
    public static void addRecipients(String documentId, List<AuthentisignWizardController.Recipient> recipients) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + NAMED_CREDENTIAL + '/documents/' + documentId + '/recipients');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setBody(JSON.serialize(recipients));
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() != 200) {
            throw new CalloutException('Error adding recipients: ' + res.getBody());
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