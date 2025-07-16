/*
*********************************************************
@Apex Class Name    : LayoutListHelper
@Created Date       : Jan 30, 2024
@description        : Helper class for LayoutListCtrl to fetch layouts from AuthentiSign
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Removed authentisign__ namespace, updated for non-CPQ document handling, fixed LayoutResponse and LayoutWrapper references, added response variable, updated getFieldMapping to handle missing Field_Mapping__mdt
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Verified compatibility with updated DataLayer.cls
* Modified Date      : Jul 14, 2025
* Modified By        : Grok
* Description        : Verified getFieldMapping accessibility, removed CPQ-related logic
*********************************************************
*/
public with sharing class LayoutListHelper {

    /*
    *********************************************************
    @Method Name    : getLayouts
    @description    : Fetch layouts from AuthentiSign and related record data
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
            response.signingStatus = response.record.get(getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c')) != null 
                ? (String) response.record.get(getFieldMapping(objectName, 'Authsign_Document_Status__c', 'Authsign_Document_Status__c')) 
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
    @Method Name    : getFieldMapping
    @description    : Get field mapping from custom metadata or return default field name
    @param          : String objectName, String fieldName, String defaultFieldName
    @return         : String
    ********************************************************
    */
    @AuraEnabled
    public static String getFieldMapping(String objectName, String fieldName, String defaultFieldName) {
        String mappedField = defaultFieldName;
        try {
            Schema.DescribeSObjectResult mdtDescribe = Schema.getGlobalDescribe().get('Field_Mapping__mdt')?.getDescribe();
            if (mdtDescribe != null && mdtDescribe.isAccessible()) {
                List<Field_Mapping__mdt> mappings = [SELECT Field_API_Name__c 
                                                    FROM Field_Mapping__mdt 
                                                    WHERE Object_API_Name__c = :objectName 
                                                    AND Mapping_Name__c = :fieldName 
                                                    LIMIT 1];
                if (!mappings.isEmpty()) {
                    mappedField = mappings[0].Field_API_Name__c;
                }
            }
        } catch (Exception e) {
            System.debug('Error fetching field mapping, using default: ' + defaultFieldName + ', Error: ' + e.getMessage());
        }
        return mappedField;
    }
}