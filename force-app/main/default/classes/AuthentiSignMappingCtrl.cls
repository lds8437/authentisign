/*
*********************************************************
@Apex Class Name    : AuthentiSignMappingCtrl
@Created Date       : Sep 18, 2023
@description        : Controller for AuthentiSign mapping LWC
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Removed authentisign__ namespace, updated for non-CPQ document handling
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Updated to align with Utility.cls, SignersRequest, SigningResponse, and DataLayer.cls changes
* Modified Date      : Jul 14, 2025
* Modified By        : Grok
* Description        : Added getAllData and fillAndSubmit methods, removed CPQ-related logic
* Modified Date      : Jul 14, 2025
* Modified By        : Grok
* Description        : Fixed 'fieldProps' error in getAllData by using Schema.describeSObject
*********************************************************
*/
public with sharing class AuthentiSignMappingCtrl {

    /*
    *********************************************************
    @Method Name    : getSObjectFields
    @description    : Retrieve sObject fields and metadata
    @param          : String objectName
    @return         : SObjectFieldPackage
    ********************************************************
    */
    @AuraEnabled
    public static SObjectFieldPackage getSObjectFields(String objectName) {
        try {
            return Utility.getSObjectFields(objectName, 'WHERE Id != null', '', 'LIMIT 1');
        } catch (Exception e) {
            System.debug('Error in getSObjectFields: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving fields: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : submitDocumentRequest
    @description    : Submit document signing request
    @param          : String recordId, String objectName, String documentId, String documentName, String quoteName, List<SignersRequest> signers
    @return         : SigningResponse
    ********************************************************
    */
    @AuraEnabled
    public static SigningResponse submitDocumentRequest(String recordId, String objectName, String documentId, String documentName, String quoteName, List<SignersRequest> signers) {
        try {
            Setting__c setting = Utility.getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            Map<String, String> requestParams = new Map<String, String>{
                'objectName' => objectName,
                'documentId' => documentId,
                'documentName' => documentName,
                'quoteName' => quoteName,
                'url' => setting.Endpoint__c + '/api/v1/signings',
                'externalId' => setting.Account_Id__c
            };
            
            String responseBody = Utility.submitDocumentRequest(signers, requestParams);
            SigningResponse response = (SigningResponse) JSON.deserialize(responseBody, SigningResponse.class);
            
            SObject record = Schema.getGlobalDescribe().get(objectName).newSObject();
            record.put('Id', recordId);
            record.put(LayoutListHelper.getFieldMapping(objectName, 'Document_Signing_Id__c', 'Document_Signing_Id__c'), response.id);
            record.put(LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c'), response.statusId != null ? String.valueOf(response.statusId) : 'Pending');
            update record;
            
            return response;
        } catch (Exception e) {
            System.debug('Error in submitDocumentRequest: ' + e.getMessage());
            throw new AuraHandledException('Error submitting document request: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getSigningStatus
    @description    : Retrieve signing status
    @param          : String recordId, String objectName
    @return         : SigningStatusResponse
    ********************************************************
    */
    @AuraEnabled
    public static SigningStatusResponse getSigningStatus(String recordId, String objectName) {
        try {
            SObject record = DataLayer.getRecordById(recordId, objectName);
            String signingId = (String) record.get(LayoutListHelper.getFieldMapping(objectName, 'Document_Signing_Id__c', 'Document_Signing_Id__c'));
            if (String.isBlank(signingId)) {
                throw new AuraHandledException('No signing ID found.');
            }
            
            Setting__c setting = Utility.getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            Map<String, String> headers = new Map<String, String>{
                'Authorization' => 'Bearer ' + setting.Bearer_Token__c,
                'Accept' => 'application/json',
                'externalId' => setting.Account_Id__c
            };
            String endpoint = setting.Endpoint__c + '/api/v1/signings/' + signingId;
            String responseBody = Utility.sendHttpRequest('GET', endpoint, headers, setting.Bearer_Token__c, '');
            
            SigningStatusResponse response = (SigningStatusResponse) JSON.deserialize(responseBody, SigningStatusResponse.class);
            
            record.put(LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c'), response.status);
            update record;
            
            return response;
        } catch (Exception e) {
            System.debug('Error in getSigningStatus: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving signing status: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getAllData
    @description    : Retrieve all necessary data for AuthentiSign mapping
    @param          : String recordId, String objectName
    @return         : Map<String, Object>
    ********************************************************
    */
    @AuraEnabled
    public static Map<String, Object> getAllData(String recordId, String objectName) {
        try {
            Map<String, Object> result = new Map<String, Object>();
            
            // Get record data
            result.put('record', DataLayer.getRecordById(recordId, objectName));
            
            // Get record field properties using Schema.describeSObject
            Map<String, Map<String, Object>> fieldProps = new Map<String, Map<String, Object>>();
            Schema.DescribeSObjectResult describe = Schema.getGlobalDescribe().get(objectName).getDescribe();
            Map<String, Schema.SObjectField> fieldMap = describe.fields.getMap();
            for (String fieldName : fieldMap.keySet()) {
                Schema.DescribeFieldResult field = fieldMap.get(fieldName).getDescribe();
                fieldProps.put(fieldName, new Map<String, Object>{
                    'label' => field.getLabel(),
                    'type' => field.getType().name(),
                    'custom' => String.valueOf(field.isCustom())
                });
            }
            result.put('recordFieldProps', fieldProps);
            
            // Get user/contact field mappings
            Map<String, String> userContactFieldMap = new Map<String, String>();
            Map<String, List<String>> participantFields = new Map<String, List<String>>();
            List<Field_Mapping__mdt> mappings = [SELECT Mapping_Name__c, Field_API_Name__c 
                                                FROM Field_Mapping__mdt 
                                                WHERE Object_API_Name__c = :objectName 
                                                AND Mapping_Name__c IN ('OwnerId', 'CreatedById', 'LastModifiedById', 'ContactId')];
            for (Field_Mapping__mdt mapping : mappings) {
                String fieldName = mapping.Field_API_Name__c;
                userContactFieldMap.put(fieldName, fieldName);
                List<String> fields = new List<String>();
                if (fieldName.contains('OwnerId') || fieldName.contains('CreatedById') || fieldName.contains('LastModifiedById')) {
                    fields.add('User');
                } else if (fieldName.contains('ContactId')) {
                    fields.add('Contact');
                }
                participantFields.put(fieldName, fields);
            }
            result.put('userContactFieldMap', userContactFieldMap);
            result.put('participantFields', participantFields);
            
            return result;
        } catch (Exception e) {
            System.debug('Error in getAllData: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving data: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : fillAndSubmit
    @description    : Fill and submit signing request with field mappings
    @param          : String requestString, String recordId, String layoutId, String mappings, String objectName
    @return         : Boolean
    ********************************************************
    */
    @AuraEnabled
    public static Boolean fillAndSubmit(String requestString, String recordId, String layoutId, String mappings, String objectName) {
        try {
            Setting__c setting = Utility.getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            Map<String, String> headers = new Map<String, String>{
                'Authorization' => 'Bearer ' + setting.Bearer_Token__c,
                'Accept' => 'application/json',
                'externalId' => setting.Account_Id__c
            };
            
            String endpoint = setting.Endpoint__c + '/api/v1/layouts/' + layoutId + '/fill-and-sign';
            String responseBody = Utility.sendHttpRequest('POST', endpoint, headers, setting.Bearer_Token__c, requestString);
            
            SigningResponse response = (SigningResponse) JSON.deserialize(responseBody, SigningResponse.class);
            
            SObject record = Schema.getGlobalDescribe().get(objectName).newSObject();
            record.put('Id', recordId);
            record.put(LayoutListHelper.getFieldMapping(objectName, 'Document_Signing_Id__c', 'Document_Signing_Id__c'), response.id);
            record.put(LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c'), response.statusId != null ? String.valueOf(response.statusId) : 'Pending');
            record.put(LayoutListHelper.getFieldMapping(objectName, 'Layout_Id__c', 'Layout_Id__c'), layoutId);
            if (mappings != null) {
                record.put(LayoutListHelper.getFieldMapping(objectName, 'Mappings__c', 'Mappings__c'), mappings);
            }
            update record;
            
            return response != null && response.id != null;
        } catch (Exception e) {
            System.debug('Error in fillAndSubmit: ' + e.getMessage());
            throw new AuraHandledException('Error submitting signing request: ' + e.getMessage());
        }
    }
}