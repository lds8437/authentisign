/*
*********************************************************
@Apex Class Name    : DataLayer
@Created Date       : Jan 30, 2024
@description        : Data access layer for AuthentiSign integration
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Removed authentisign__ namespace, updated for non-CPQ document handling with ContentDocumentLink/ContentVersion
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Fixed syntax error in getRecordById to resolve invalid backslash issue
*********************************************************
*/
public with sharing class DataLayer {

    /*
    *********************************************************
    @Method Name    : getSetting
    @description    : Retrieve AuthentiSign settings
    @param          : None
    @return         : Setting__c
    ********************************************************
    */
    public static Setting__c getSetting() {
        try {
            return [SELECT Id, Endpoint__c, Bearer_Token__c, Account_Id__c, Callback_Url__c 
                    FROM Setting__c 
                    LIMIT 1];
        } catch (Exception e) {
            System.debug('Error in getSetting: ' + e.getMessage());
            return null;
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getRecordById
    @description    : Retrieve record by ID with dynamic fields
    @param          : String recordId, String objectName
    @return         : SObject
    ********************************************************
    */
    public static SObject getRecordById(String recordId, String objectName) {
        try {
            List<String> fields = new List<String>{
                'Id',
                'Name',
                LayoutListHelper.getFieldMapping(objectName, 'AttachmentId__c', 'AttachmentId__c'),
                LayoutListHelper.getFieldMapping(objectName, 'Document_Attachment_Id__c', 'Document_Attachment_Id__c'),
                LayoutListHelper.getFieldMapping(objectName, 'Document_Signing_Id__c', 'Document_Signing_Id__c'),
                LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c')
            };
            String query = 'SELECT ' + String.join(fields, ', ') + ' FROM ' + String.escapeSingleQuotes(objectName) + ' WHERE Id = :recordId LIMIT 1';
            return Database.query(query);
        } catch (Exception e) {
            System.debug('Error in getRecordById: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving record: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getDocuments
    @description    : Retrieve documents linked to a record
    @param          : String recordId, String objectName
    @return         : Map<String, String>
    ********************************************************
    */
    public static Map<String, String> getDocuments(String recordId, String objectName) {
        Map<String, String> documents = new Map<String, String>();
        try {
            List<ContentDocumentLink> cdls = [SELECT ContentDocumentId, ContentDocument.Title 
                                             FROM ContentDocumentLink 
                                             WHERE LinkedEntityId = :recordId];
            for (ContentDocumentLink cdl : cdls) {
                documents.put(cdl.ContentDocumentId, cdl.ContentDocument.Title);
            }
            return documents;
        } catch (Exception e) {
            System.debug('Error in getDocuments: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving documents: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getDocumentById
    @description    : Retrieve document content by ID
    @param          : String documentId, String objectName
    @return         : Blob
    ********************************************************
    */
    public static Blob getDocumentById(String documentId, String objectName) {
        try {
            ContentVersion cv = [SELECT VersionData 
                                FROM ContentVersion 
                                WHERE ContentDocumentId = :documentId 
                                AND IsLatest = true 
                                LIMIT 1];
            return cv.VersionData;
        } catch (Exception e) {
            System.debug('Error in getDocumentById: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving document content: ' + e.getMessage());
        }
    }
    
    /*
    *********************************************************
    @Method Name    : getAttachmentId
    @description    : Retrieve attachment ID from record
    @param          : String recordId, String objectName
    @return         : String
    ********************************************************
    */
    public static String getAttachmentId(String recordId, String objectName) {
        try {
            List<String> fields = new List<String>{
                LayoutListHelper.getFieldMapping(objectName, 'AttachmentId__c', 'AttachmentId__c'),
                LayoutListHelper.getFieldMapping(objectName, 'Document_Attachment_Id__c', 'Document_Attachment_Id__c')
            };
            String query = 'SELECT ' + String.join(fields, ', ') + ' FROM ' + String.escapeSingleQuotes(objectName) + ' WHERE Id = :recordId LIMIT 1';
            SObject record = Database.query(query);
            String attachmentId = (String)record.get(LayoutListHelper.getFieldMapping(objectName, 'AttachmentId__c', 'AttachmentId__c'));
            if (String.isBlank(attachmentId)) {
                attachmentId = (String)record.get(LayoutListHelper.getFieldMapping(objectName, 'Document_Attachment_Id__c', 'Document_Attachment_Id__c'));
            }
            return attachmentId;
        } catch (Exception e) {
            System.debug('Error in getAttachmentId: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving attachment ID: ' + e.getMessage());
        }
    }
}