/*
*********************************************************
@Apex Class Name    : Utility
@Created Date       : Jan 30, 2024
@description        : Utility class for AuthentiSign integration
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Removed authentisign__ namespace, updated for non-CPQ document handling with ContentDocumentLink/ContentVersion
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Fixed SignersRequest compilation errors, updated savePDFasAttachment and savePDFasAttachmentDocument to use ContentVersion, verified compatibility with updated DataLayer.cls
*********************************************************
*/
public with sharing class Utility {

    /*
    *********************************************************
    @Method Name    : getSetting
    @description    : Calls DataLayer class to get the setting record
    @param          : None
    @return         : Setting__c 
    ********************************************************
    */
    public static Setting__c getSetting() {
        return DataLayer.getSetting();
    }
    
    /*
    *********************************************************
    @Method Name    : createQueryParams
    @description    : Create query parameter for HTTP request
    @param          : Map<String, String> params
    @return         : String  
    ********************************************************
    */
    public static String createQueryParams(Map<String, String> params) {
        String result = '';
        for (String key : params.keySet()) {
            if (result == '') {
                result = key + '=' + params.get(key);
            } else {
                result += '&' + key + '=' + params.get(key);
            }
        }
        return result;
    }
    
    /*
    *********************************************************
    @Method Name    : sendHttpRequest
    @description    : Send HTTP request to AuthentiSign and get the response
    @param          : String verb, String endpoint, Map<String, String> headers, String token, String requestBody
    @return         : String 
    ********************************************************
    */
    public static String sendHttpRequest(String verb, String endpoint, Map<String, String> headers, String token, String requestBody) {
        try {
            HttpRequest request = new HttpRequest();
            request.setEndpoint(endpoint);
            request.setTimeout(120000);
            request.setMethod(verb);
            
            if (headers != null && headers.size() > 0) {
                for (String key : headers.keySet()) {
                    request.setHeader(key, headers.get(key));
                }
            }
            
            if (String.isNotBlank(requestBody)) {
                request.setBody(requestBody);
            }
            
            System.debug('externalId: ' + request.getHeader('externalId'));
            System.debug('Authorization: ' + request.getHeader('Authorization'));
            
            Http http = new Http();
            HttpResponse response = http.send(request);
            String body = response.getBody();
            System.debug('response body: ' + body);
            
            if (response.getStatusCode() == 200) {
                return body;
            } else {
                throw new AuraHandledException('HTTP request failed: ' + response.getStatus());
            }
        } catch (Exception e) {
            System.debug('Error in sendHttpRequest: ' + e.getMessage());
            throw new AuraHandledException('Error sending HTTP request: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : sendHttpRequestBlob
    @description    : Send HTTP request to AuthentiSign and get the PDF response
    @param          : String verb, String endpoint, Map<String, String> headers, String token, String requestBody
    @return         : PDFResponse 
    ********************************************************
    */
    public static PDFResponse sendHttpRequestBlob(String verb, String endpoint, Map<String, String> headers, String token, String requestBody) {
        try {
            HttpRequest request = new HttpRequest();
            request.setEndpoint(endpoint);
            request.setTimeout(120000);
            request.setMethod(verb);
            
            if (headers != null && headers.size() > 0) {
                for (String key : headers.keySet()) {
                    request.setHeader(key, headers.get(key));
                }
            }
            
            if (String.isNotBlank(requestBody)) {
                request.setBody(requestBody);
            }
            
            System.debug('externalId: ' + request.getHeader('externalId'));
            System.debug('Authorization: ' + request.getHeader('Authorization'));
            
            Http http = new Http();
            HttpResponse response = http.send(request);
            
            PDFResponse finalResult = new PDFResponse();
            finalResult.pdfBlob = response.getBodyAsBlob();
            finalResult.pdfStream = EncodingUtil.base64Encode(finalResult.pdfBlob);
            finalResult.fileName = '';
            
            String contentDisposition = response.getHeader('Content-Disposition');
            if (String.isNotBlank(contentDisposition)) {
                Integer startIndex = contentDisposition.indexOf('filename=');
                if (startIndex >= 0) {
                    finalResult.fileName = contentDisposition.substring(startIndex + 'filename='.length(), contentDisposition.length());
                    finalResult.fileName = EncodingUtil.urlDecode(finalResult.fileName, 'UTF-8');
                }
            }
            System.debug('fileName: ' + finalResult.fileName);
            
            return finalResult;
        } catch (Exception e) {
            System.debug('Error in sendHttpRequestBlob: ' + e.getMessage());
            throw new AuraHandledException('Error fetching PDF: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getPDFResponse
    @description    : Create the request and call sendHttpRequestBlob to get PDF response
    @param          : String token, String accountId, String baseurl, String signingId, String signingMethod
    @return         : PDFResponse 
    ********************************************************
    */
    public static PDFResponse getPDFResponse(String token, String accountId, String baseurl, String signingId, String signingMethod) {
        try {
            Map<String, String> params = new Map<String, String>{'language' => 'en'};
            String queryParams = createQueryParams(params);
            
            String requestMethod = '/api/v1/signings/' + signingId + '/documents/' + signingMethod;
            String endpoint = baseurl + requestMethod + '?' + queryParams;
            System.debug('endpoint: ' + endpoint);
            
            Map<String, String> headers = new Map<String, String>{
                'Authorization' => 'Bearer ' + token,
                'Accept' => 'application/pdf',
                'externalId' => accountId
            };
            
            PDFResponse responseResult = sendHttpRequestBlob('GET', endpoint, headers, token, '');
            if (String.isBlank(responseResult.fileName)) {
                responseResult.fileName = 'AuthentiSign_' + signingMethod + '_' + signingId + '.pdf';
            }
            
            return responseResult;
        } catch (Exception e) {
            System.debug('Error in getPDFResponse: ' + e.getMessage());
            throw new AuraHandledException('Error fetching PDF: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getPDFLinkResponse
    @description    : Create the request and call sendHttpRequest to get PDF link response
    @param          : String token, String accountId, String baseurl, String signingId, String signingMethod
    @return         : String 
    ********************************************************
    */
    public static String getPDFLinkResponse(String token, String accountId, String baseurl, String signingId, String signingMethod) {
        try {
            Map<String, String> params = new Map<String, String>{'language' => 'en'};
            String queryParams = createQueryParams(params);
            
            String requestMethod = '/api/v1/signings/' + signingId + '/documents/' + signingMethod;
            String endpoint = baseurl + requestMethod + '?' + queryParams;
            System.debug('endpoint: ' + endpoint);
            
            Map<String, String> headers = new Map<String, String>{
                'Authorization' => 'Bearer ' + token,
                'Accept' => '*/*',
                'externalId' => accountId
            };
            
            return sendHttpRequest('GET', endpoint, headers, token, '');
        } catch (Exception e) {
            System.debug('Error in getPDFLinkResponse: ' + e.getMessage());
            throw new AuraHandledException('Error fetching PDF link: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : savePDFasAttachment
    @description    : Save the retrieved PDF response as a ContentVersion to the requested record
    @param          : String recordId, String signingId, String pdfMethod, String objectName
    @return         : String (ContentVersion Id) 
    ********************************************************
    */
    public static String savePDFasAttachment(String recordId, String signingId, String pdfMethod, String objectName) {
        try {
            Setting__c setting = getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            PDFResponse pdfResponseObj = getPDFResponse(setting.Bearer_Token__c, setting.Account_Id__c, setting.Endpoint__c, signingId, pdfMethod);
            
            ContentVersion cv = new ContentVersion();
            cv.Title = pdfResponseObj.fileName;
            cv.PathOnClient = pdfResponseObj.fileName;
            cv.VersionData = pdfResponseObj.pdfBlob;
            cv.FirstPublishLocationId = recordId;
            cv.ContentLocation = 'S';
            insert cv;
            
            SObject record = Schema.getGlobalDescribe().get(objectName).newSObject();
            record.put('Id', recordId);
            record.put(LayoutListHelper.getFieldMapping(objectName, 'AttachmentId__c', 'AttachmentId__c'), cv.Id);
            update record;
            
            return cv.Id;
        } catch (Exception e) {
            System.debug('Error in savePDFasAttachment: ' + e.getMessage() + ' , line: ' + e.getLineNumber());
            throw new AuraHandledException('Error saving PDF as ContentVersion: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : savePDFasAttachmentDocument
    @description    : Save the retrieved PDF response as a ContentVersion to the requested record
    @param          : String recordId, String signingId, String pdfMethod, String objectName
    @return         : String (ContentVersion Id) 
    ********************************************************
    */
    public static String savePDFasAttachmentDocument(String recordId, String signingId, String pdfMethod, String objectName) {
        try {
            Setting__c setting = getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            PDFResponse pdfResponseObj = getPDFResponse(setting.Bearer_Token__c, setting.Account_Id__c, setting.Endpoint__c, signingId, pdfMethod);
            
            ContentVersion cv = new ContentVersion();
            cv.Title = pdfResponseObj.fileName;
            cv.PathOnClient = pdfResponseObj.fileName;
            cv.VersionData = pdfResponseObj.pdfBlob;
            cv.FirstPublishLocationId = recordId;
            cv.ContentLocation = 'S';
            insert cv;
            
            SObject record = Schema.getGlobalDescribe().get(objectName).newSObject();
            record.put('Id', recordId);
            record.put(LayoutListHelper.getFieldMapping(objectName, 'Document_Attachment_Id__c', 'Document_Attachment_Id__c'), cv.Id);
            update record;
            
            return cv.Id;
        } catch (Exception e) {
            System.debug('Error in savePDFasAttachmentDocument: ' + e.getMessage() + ' , line: ' + e.getLineNumber());
            throw new AuraHandledException('Error saving PDF as ContentVersion: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getSObjectFields
    @description    : Get fields schema information for the specified object
    @param          : String objectName, String whereClause, String orderBy, String recordLimit
    @return         : SObjectFieldPackage 
    ********************************************************
    */
    public static SObjectFieldPackage getSObjectFields(String objectName, String whereClause, String orderBy, String recordLimit) {
        SObjectFieldPackage wrapper = new SObjectFieldPackage();
        wrapper.sObjectFieldsList = new List<String>();
        wrapper.sObjectFieldsProperties = new Map<String, Map<String, String>>();
        wrapper.participantList = new Map<String, List<String>>();
        wrapper.userContactFieldMap = new Map<String, String>();
        
        try {
            Map<String, Schema.SObjectField> sObjectFieldMap = Schema.getGlobalDescribe().get(objectName.toLowerCase()).getDescribe().Fields.getMap();
            
            for (String fieldName : sObjectFieldMap.keySet()) {
                Schema.DescribeFieldResult fieldDescribe = sObjectFieldMap.get(fieldName).getDescribe();
                if (fieldDescribe.isAccessible()) {
                    wrapper.sObjectFieldsList.add(fieldName);
                    wrapper.sObjectFieldsProperties.put(fieldName, new Map<String, String>{
                        'custom' => String.valueOf(fieldDescribe.isCustom()),
                        'label' => fieldDescribe.getLabel(),
                        'length' => String.valueOf(fieldDescribe.getLength()),
                        'localName' => fieldDescribe.getLocalName(),
                        'name' => fieldName,
                        'referenceTo' => String.valueOf(fieldDescribe.getReferenceTo()),
                        'type' => String.valueOf(fieldDescribe.getType())
                    });
                    
                    if (fieldDescribe.getReferenceTo().size() > 0) {
                        String lookupFieldName = fieldDescribe.isCustom() ? 
                            fieldName.replace('__c', '__r') : 
                            fieldName.replace('Id', '').replace('id', '');
                        if (String.isNotBlank(lookupFieldName)) {
                            String referenceTo = String.valueOf(fieldDescribe.getReferenceTo()[0]);
                            if ((referenceTo.toLowerCase().contains('contact') || referenceTo.toLowerCase().contains('user')) && 
                                !fieldName.equalsIgnoreCase('createdbyid') && !fieldName.equalsIgnoreCase('lastmodifiedbyid')) {
                                List<String> referenceFields = new List<String>{
                                    'Id', 'Name', 'FirstName', 'LastName', 'Email', 'Phone', referenceTo
                                };
                                wrapper.sObjectFieldsList.add(lookupFieldName + '.Name');
                                wrapper.sObjectFieldsList.add(lookupFieldName + '.FirstName');
                                wrapper.sObjectFieldsList.add(lookupFieldName + '.LastName');
                                wrapper.sObjectFieldsList.add(lookupFieldName + '.Email');
                                wrapper.sObjectFieldsList.add(lookupFieldName + '.Phone');
                                wrapper.participantList.put(lookupFieldName, referenceFields);
                                wrapper.userContactFieldMap.put(fieldName, lookupFieldName);
                            } else if (Schema.getGlobalDescribe().get(referenceTo.toLowerCase()).getDescribe().Fields.getMap().containsKey('Name')) {
                                wrapper.sObjectFieldsList.add(lookupFieldName + '.Name');
                            }
                        }
                    }
                }
            }
            
            wrapper.query = 'SELECT ' + String.join(wrapper.sObjectFieldsList, ', ') + ' FROM ' + String.escapeSingleQuotes(objectName) + ' ' + whereClause + ' ' + orderBy + ' ' + recordLimit;
            return wrapper;
        } catch (Exception e) {
            System.debug('Error in getSObjectFields: ' + e.getMessage());
            return null;
        }
    }
    
    /*
    *********************************************************
    @Method Name    : submitDocumentRequest
    @description    : Submit document signing request to AuthentiSign
    @param          : List<SignersRequest> signers, Map<String, String> requestParams
    @return         : String 
    ********************************************************
    */
    public static String submitDocumentRequest(List<SignersRequest> signers, Map<String, String> requestParams) {
        try {
            String objectName = requestParams.get('objectName');
            String documentId = requestParams.get('documentId');
            String documentName = requestParams.get('documentName');
            String quoteName = requestParams.get('quoteName');
            String url = requestParams.get('url');
            String externalId = requestParams.get('externalId');
            
            Setting__c setting = getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            Blob fileBlob = DataLayer.getDocumentById(documentId, objectName);
            if (fileBlob == null) {
                throw new AuraHandledException('Document not found.');
            }
            
            HttpHexFormBuilder builder = HttpHexFormBuilder.build()
                .writeParam('Name', quoteName + ' - ' + documentName);
            
            for (Integer x = 0; x < signers.size(); x++) {
                SignersRequest signer = signers[x];
                builder.writeParam('Participants[' + x + '].ParticipantRole', signer.data.Role != null ? signer.data.Role : '')
                    .writeParam('Participants[' + x + '].Email', signer.data.Email != null ? signer.data.Email : '')
                    .writeParam('Participants[' + x + '].FirstName', signer.data.FirstName != null ? signer.data.FirstName : '')
                    .writeParam('Participants[' + x + '].LastName', signer.data.LastName != null ? signer.data.LastName : '')
                    .writeParam('Participants[' + x + '].StaticSignatureEnabled', 'true')
                    .writeParam('Participants[' + x + '].ScriptedSignatureEnabled', 'true')
                    .writeParam('Participants[' + x + '].ImageSignatureEnabled', 'true');
            }
            
            builder.writeFile('Files', documentName + '.pdf', EncodingUtil.base64Encode(fileBlob));
            Blob formData = builder.getFormAsBlob();
            
            Map<String, String> headers = new Map<String, String>{
                'Connection' => 'keep-alive',
                'Content-Length' => String.valueOf(formData.size()),
                'Content-Type' => HttpHexFormBuilder.getContentType(),
                'Authorization' => 'Bearer ' + setting.Bearer_Token__c,
                'externalId' => externalId
            };
            
            String responseBody = sendHttpRequest('POST', url, headers, setting.Bearer_Token__c, EncodingUtil.base64Encode(formData));
            responseBody = responseBody.replace('\r', '').replace('\n', '');
            System.debug('responseBody: ' + responseBody);
            
            return responseBody;
        } catch (Exception e) {
            System.debug('Error in submitDocumentRequest: ' + e.getMessage());
            throw new AuraHandledException('Error submitting document request: ' + e.getMessage());
        }
    }
}