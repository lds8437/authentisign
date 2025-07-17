/*
*********************************************************
@Apex Class Name    : LayoutListCtrl
@Created Date       : Jan 30, 2024
@description        : Controller for AuthentiSign layout list LWC
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Removed authentisign__ namespace, updated for non-CPQ document handling
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Verified compatibility with updated DataLayer.cls
* Modified Date      : Jul 14, 2025
* Modified By        : Grok
* Description        : Added getLayoutMappings to support authentiSignLayoutList LWC
*********************************************************
*/
public with sharing class LayoutListCtrl {

    /*
    *********************************************************
    @Method Name    : getLayouts
    @description    : Fetch layouts from AuthentiSign and related Opportunity data
    @param          : String recordId, String objectName
    @return         : LayoutResponse
    ********************************************************
    */
    @AuraEnabled
    public static LayoutResponse getLayouts(String recordId, String objectName) {
        LayoutResponse response = new LayoutResponse();
        response.wrapper = new List<LayoutWrapper>();
        response.documents = new Map<String, String>();
        
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
            String endpoint = setting.Endpoint__c + '/api/v1/layouts';
            String responseBody = Utility.sendHttpRequest('GET', endpoint, headers, setting.Bearer_Token__c, '');
            
            Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
            List<Object> layouts = (List<Object>) responseMap.get('layouts');
            
            for (Object layoutObj : layouts) {
                Map<String, Object> layout = (Map<String, Object>) layoutObj;
                LayoutWrapper wrapper = new LayoutWrapper();
                wrapper.id = (String) layout.get('id');
                wrapper.name = (String) layout.get('name');
                wrapper.dateCreated = layout.get('dateCreated') != null ? DateTime.valueOf((String) layout.get('dateCreated')) : null;
                wrapper.lastModified = layout.get('lastModified') != null ? DateTime.valueOf((String) layout.get('lastModified')) : null;
                wrapper.roles = (List<String>) layout.get('roles');
                wrapper.fields = (List<String>) layout.get('fields');
                wrapper.layoutParticipants = new List<LayoutParticipant>();
                
                List<Object> participants = (List<Object>) layout.get('participants');
                if (participants != null) {
                    for (Object participantObj : participants) {
                        Map<String, Object> participant = (Map<String, Object>) participantObj;
                        LayoutParticipant lp = new LayoutParticipant();
                        lp.id = (String) participant.get('id');
                        lp.layoutId = (String) participant.get('layoutId');
                        lp.role = (String) participant.get('role');
                        lp.order = participant.get('order') != null ? Integer.valueOf(participant.get('order')) : null;
                        lp.dateCreated = participant.get('dateCreated') != null ? DateTime.valueOf((String) participant.get('dateCreated')) : null;
                        lp.layout = (String) participant.get('layout');
                        wrapper.layoutParticipants.add(lp);
                    }
                }
                response.wrapper.add(wrapper);
            }
            
            response.record = DataLayer.getRecordById(recordId, objectName);
            response.documents = DataLayer.getDocuments(recordId, objectName);
            response.signingStatus = response.record.get(LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c')) != null 
                ? (String) response.record.get(LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c')) 
                : 'not sent';
            response.documentSigningStatus = response.signingStatus;
            
            return response;
        } catch (Exception e) {
            System.debug('Error in getLayouts: ' + e.getMessage());
            throw new AuraHandledException('Error fetching layouts: ' + e.getMessage());
        }
    }

    /*
    *********************************************************
    @Method Name    : getLayoutMappings
    @description    : Fetch layouts from AuthentiSign and related Opportunity data
    @param          : String recordId, String objectName
    @return         : LayoutResponse
    ********************************************************
    */
    @AuraEnabled
    public static LayoutResponse getLayoutMappings(String recordId, String objectName) {
        LayoutResponse response = new LayoutResponse();
        response.wrapper = new List<LayoutWrapper>();
        response.documents = new Map<String, String>();
        
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
            String endpoint = setting.Endpoint__c + '/api/v1/layouts';
            String responseBody = Utility.sendHttpRequest('GET', endpoint, headers, setting.Bearer_Token__c, '');
            
            Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
            List<Object> layouts = (List<Object>) responseMap.get('layouts');
            
            for (Object layoutObj : layouts) {
                Map<String, Object> layout = (Map<String, Object>) layoutObj;
                LayoutWrapper wrapper = new LayoutWrapper();
                wrapper.id = (String) layout.get('id');
                wrapper.name = (String) layout.get('name');
                wrapper.dateCreated = layout.get('dateCreated') != null ? DateTime.valueOf((String) layout.get('dateCreated')) : null;
                wrapper.lastModified = layout.get('lastModified') != null ? DateTime.valueOf((String) layout.get('lastModified')) : null;
                wrapper.roles = (List<String>) layout.get('roles');
                wrapper.fields = (List<String>) layout.get('fields');
                wrapper.layoutParticipants = new List<LayoutParticipant>();
                
                List<Object> participants = (List<Object>) layout.get('participants');
                if (participants != null) {
                    for (Object participantObj : participants) {
                        Map<String, Object> participant = (Map<String, Object>) participantObj;
                        LayoutParticipant lp = new LayoutParticipant();
                        lp.id = (String) participant.get('id');
                        lp.layoutId = (String) participant.get('layoutId');
                        lp.role = (String) participant.get('role');
                        lp.order = participant.get('order') != null ? Integer.valueOf(participant.get('order')) : null;
                        lp.dateCreated = participant.get('dateCreated') != null ? DateTime.valueOf((String) participant.get('dateCreated')) : null;
                        lp.layout = (String) participant.get('layout');
                        wrapper.layoutParticipants.add(lp);
                    }
                }
                response.wrapper.add(wrapper);
            }
            
            response.record = DataLayer.getRecordById(recordId, objectName);
            response.documents = DataLayer.getDocuments(recordId, objectName);
            response.signingStatus = response.record.get(LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c')) != null 
                ? (String) response.record.get(LayoutListHelper.getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c')) 
                : 'not sent';
            response.documentSigningStatus = response.signingStatus;
            
            return response;
        } catch (Exception e) {
            System.debug('Error in getLayoutMappings: ' + e.getMessage());
            throw new AuraHandledException('Error fetching layouts: ' + e.getMessage());
        }
    }
    /*
    *********************************************************
    @Method Name    : saveAttachment
    @description    : Save attachment for layout or document
    @param          : String recordId, String signingId, String objectName, Boolean isLayout
    @return         : String (attachment ID)
    ********************************************************
    */
    @AuraEnabled
    public static String saveAttachment(String recordId, String signingId, String objectName, Boolean isLayout) {
        try {
            Setting__c setting = Utility.getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            Map<String, String> headers = new Map<String, String>{
                'Authorization' => 'Bearer ' + setting.Bearer_Token__c,
                'Accept' => 'application/pdf',
                'externalId' => setting.Account_Id__c
            };
            String endpoint = setting.Endpoint__c + '/api/v1/signings/' + signingId + '/download';
            String responseBody = Utility.sendHttpRequest('GET', endpoint, headers, setting.Bearer_Token__c, '');
            
            ContentVersion cv = new ContentVersion();
            cv.Title = isLayout ? 'Layout_' + signingId : 'Document_' + signingId;
            cv.PathOnClient = cv.Title + '.pdf';
            cv.VersionData = EncodingUtil.base64Decode(responseBody);
            cv.IsMajorVersion = true;
            insert cv;
            
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.ContentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1].ContentDocumentId;
            cdl.LinkedEntityId = recordId;
            cdl.ShareType = 'V';
            insert cdl;
            
            String fieldName = isLayout ? 
                LayoutListHelper.getFieldMapping(objectName, 'AttachmentId__c', 'AttachmentId__c') : 
                LayoutListHelper.getFieldMapping(objectName, 'Document_Attachment_Id__c', 'Document_Attachment_Id__c');
            SObject record = Schema.getGlobalDescribe().get(objectName).newSObject();
            record.put('Id', recordId);
            record.put(fieldName, cdl.ContentDocumentId);
            update record;
            
            return cdl.ContentDocumentId;
        } catch (Exception e) {
            System.debug('Error in saveAttachment: ' + e.getMessage());
            throw new AuraHandledException('Error saving attachment: ' + e.getMessage());
        }
    }
}