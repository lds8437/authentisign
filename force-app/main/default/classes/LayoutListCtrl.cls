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
* Modified Date      : Jul 20, 2025
* Modified By        : Grok
* Description        : Removed cacheable=true from saveAttachment due to DML operations
* Modified Date      : Jul 20, 2025
* Modified By        : Grok
* Description        : Added language parameter to API request to fix 400 Bad Request error
* Modified Date      : Jul 20, 2025
* Modified By        : Grok
* Description        : Updated deserialization to handle List<Object> API response
* Modified Date      : Jul 22, 2025
* Modified By        : Grok
* Description        : Used DataLayer.getSetting, removed Is_Active__c, fixed syntax error
* Modified Date      : Jul 28, 2025
* Modified By        : Grok
* Description        : Fixed date/time parsing error for API response (Invalid date/time: 2025-06-09T10:27:35.17)
* Modified Date      : Jul 28, 2025
* Modified By        : Grok
* Description        : Fixed List<ANY> to List<String> conversion for fields and roles
*********************************************************
*/
public with sharing class LayoutListCtrl {

    /*
    *********************************************************
    @Method Name    : normalizeDateTime
    @description    : Normalize date/time string to a format compatible with DateTime.valueOf
    @param          : String dateTimeStr
    @return         : DateTime
    ********************************************************
    */
    private static DateTime normalizeDateTime(String dateTimeStr) {
        if (String.isBlank(dateTimeStr)) {
            return null;
        }
        try {
            // Remove millisecond precision and ensure time zone (assume UTC if missing)
            String normalized = dateTimeStr;
            // Remove milliseconds (e.g., .17)
            if (normalized.contains('.')) {
                normalized = normalized.substringBefore('.') + normalized.substringAfterLast('.');
            }
            // Append 'Z' if no time zone is specified
            if (!normalized.endsWith('Z') && !normalized.contains('+') && !normalized.contains('-')) {
                normalized += 'Z';
            }
            // Replace 'T' with space for DateTime.valueOfGmt compatibility
            normalized = normalized.replace('T', ' ').replace('Z', '');
            return DateTime.valueOfGmt(normalized);
        } catch (Exception e) {
            System.debug('Error normalizing date/time: ' + dateTimeStr + ', Error: ' + e.getMessage());
            return null; // Return null for invalid date/time to avoid breaking the loop
        }
    }

    /*
    *********************************************************
    @Method Name    : getLayouts
    @description    : Fetch layouts from AuthentiSign and related Opportunity data
    @param          : String recordId, String objectName
    @return         : LayoutResponse
    ********************************************************
    */
    @AuraEnabled(cacheable=true)
    public static LayoutResponse getLayouts(String recordId, String objectName) {
        LayoutResponse response = new LayoutResponse();
        response.wrapper = new List<LayoutWrapper>();
        response.documents = new Map<String, String>();
        
        try {
            Setting__c setting = DataLayer.getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            Map<String, String> headers = new Map<String, String>{
                'Authorization' => 'Bearer ' + setting.Bearer_Token__c,
                'Accept' => 'application/json',
                'externalId' => setting.Account_Id__c
            };
            String endpoint = setting.Endpoint__c + '/api/v1/layouts?language=en';
            String responseBody = Utility.sendHttpRequest('GET', endpoint, headers, setting.Bearer_Token__c, '');
            
            // Handle both Map and List responses
            Object responseObj = JSON.deserializeUntyped(responseBody);
            List<Object> layouts;
            if (responseObj instanceof Map<String, Object>) {
                Map<String, Object> responseMap = (Map<String, Object>) responseObj;
                layouts = (List<Object>) responseMap.get('layouts');
            } else if (responseObj instanceof List<Object>) {
                layouts = (List<Object>) responseObj;
            } else {
                throw new AuraHandledException('Unexpected API response format');
            }
            
            if (layouts == null) {
                throw new AuraHandledException('No layouts found in API response');
            }
            
            for (Object layoutObj : layouts) {
                Map<String, Object> layout = (Map<String, Object>) layoutObj;
                LayoutWrapper wrapper = new LayoutWrapper();
                wrapper.id = (String) layout.get('id');
                wrapper.name = (String) layout.get('name');
                wrapper.dateCreated = layout.get('dateCreated') != null ? normalizeDateTime((String) layout.get('dateCreated')) : null;
                wrapper.lastModified = layout.get('lastModified') != null ? normalizeDateTime((String) layout.get('lastModified')) : null;
                wrapper.layoutParticipants = new List<LayoutParticipant>();
                
                // Handle fields
                wrapper.fields = new List<String>();
                Object fieldsObj = layout.get('fields');
                if (fieldsObj instanceof List<Object>) {
                    List<Object> fieldList = (List<Object>) fieldsObj;
                    for (Object field : fieldList) {
                        if (field instanceof String) {
                            wrapper.fields.add((String) field);
                        } else if (field instanceof Map<String, Object>) {
                            Map<String, Object> fieldMap = (Map<String, Object>) field;
                            String fieldName = (String) fieldMap.get('name');
                            if (String.isNotBlank(fieldName)) {
                                wrapper.fields.add(fieldName);
                            }
                        }
                    }
                }
                
                // Handle roles
                wrapper.roles = new List<String>();
                Object rolesObj = layout.get('roles');
                if (rolesObj instanceof List<Object>) {
                    List<Object> roleList = (List<Object>) rolesObj;
                    for (Object role : roleList) {
                        if (role instanceof String) {
                            wrapper.roles.add((String) role);
                        } else if (role instanceof Map<String, Object>) {
                            Map<String, Object> roleMap = (Map<String, Object>) role;
                            String roleName = (String) roleMap.get('name');
                            if (String.isNotBlank(roleName)) {
                                wrapper.roles.add(roleName);
                            }
                        }
                    }
                }
                
                List<Object> participants = (List<Object>) layout.get('participants');
                if (participants != null) {
                    for (Object participantObj : participants) {
                        Map<String, Object> participant = (Map<String, Object>) participantObj;
                        LayoutParticipant lp = new LayoutParticipant();
                        lp.id = (String) participant.get('id');
                        lp.layoutId = (String) participant.get('layoutId');
                        lp.role = (String) participant.get('role');
                        lp.order = participant.get('order') != null ? Integer.valueOf(participant.get('order')) : null;
                        lp.dateCreated = participant.get('dateCreated') != null ? normalizeDateTime((String) participant.get('dateCreated')) : null;
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
            System.debug('Error in getLayouts: ' + e.getMessage() + '\n' + e.getStackTraceString());
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
            Setting__c setting = DataLayer.getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            
            Map<String, String> headers = new Map<String, String>{
                'Authorization' => 'Bearer ' + setting.Bearer_Token__c,
                'Accept' => 'application/json',
                'externalId' => setting.Account_Id__c
            };
            String endpoint = setting.Endpoint__c + '/api/v1/layouts?language=en';
            String responseBody = Utility.sendHttpRequest('GET', endpoint, headers, setting.Bearer_Token__c, '');
            
            // Handle both Map and List responses
            Object responseObj = JSON.deserializeUntyped(responseBody);
            List<Object> layouts;
            if (responseObj instanceof Map<String, Object>) {
                Map<String, Object> responseMap = (Map<String, Object>) responseObj;
                layouts = (List<Object>) responseMap.get('layouts');
            } else if (responseObj instanceof List<Object>) {
                layouts = (List<Object>) responseObj;
            } else {
                throw new AuraHandledException('Unexpected API response format');
            }
            
            if (layouts == null) {
                throw new AuraHandledException('No layouts found in API response');
            }
            
            for (Object layoutObj : layouts) {
                Map<String, Object> layout = (Map<String, Object>) layoutObj;
                LayoutWrapper wrapper = new LayoutWrapper();
                wrapper.id = (String) layout.get('id');
                wrapper.name = (String) layout.get('name');
                wrapper.dateCreated = layout.get('dateCreated') != null ? normalizeDateTime((String) layout.get('dateCreated')) : null;
                wrapper.lastModified = layout.get('lastModified') != null ? normalizeDateTime((String) layout.get('lastModified')) : null;
                wrapper.layoutParticipants = new List<LayoutParticipant>();
                
                // Handle fields
                wrapper.fields = new List<String>();
                Object fieldsObj = layout.get('fields');
                if (fieldsObj instanceof List<Object>) {
                    List<Object> fieldList = (List<Object>) fieldsObj;
                    for (Object field : fieldList) {
                        if (field instanceof String) {
                            wrapper.fields.add((String) field);
                        } else if (field instanceof Map<String, Object>) {
                            Map<String, Object> fieldMap = (Map<String, Object>) field;
                            String fieldName = (String) fieldMap.get('name');
                            if (String.isNotBlank(fieldName)) {
                                wrapper.fields.add(fieldName);
                            }
                        }
                    }
                }
                
                // Handle roles
                wrapper.roles = new List<String>();
                Object rolesObj = layout.get('roles');
                if (rolesObj instanceof List<Object>) {
                    List<Object> roleList = (List<Object>) rolesObj;
                    for (Object role : roleList) {
                        if (role instanceof String) {
                            wrapper.roles.add((String) role);
                        } else if (role instanceof Map<String, Object>) {
                            Map<String, Object> roleMap = (Map<String, Object>) role;
                            String roleName = (String) roleMap.get('name');
                            if (String.isNotBlank(roleName)) {
                                wrapper.roles.add(roleName);
                            }
                        }
                    }
                }
                
                List<Object> participants = (List<Object>) layout.get('participants');
                if (participants != null) {
                    for (Object participantObj : participants) {
                        Map<String, Object> participant = (Map<String, Object>) participantObj;
                        LayoutParticipant lp = new LayoutParticipant();
                        lp.id = (String) participant.get('id');
                        lp.layoutId = (String) participant.get('layoutId');
                        lp.role = (String) participant.get('role');
                        lp.order = participant.get('order') != null ? Integer.valueOf(participant.get('order')) : null;
                        lp.dateCreated = participant.get('dateCreated') != null ? normalizeDateTime((String) participant.get('dateCreated')) : null;
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
            System.debug('Error in getLayoutMappings: ' + e.getMessage() + '\n' + e.getStackTraceString());
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
            Setting__c setting = DataLayer.getSetting();
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
            System.debug('Error in saveAttachment: ' + e.getMessage() + '\n' + e.getStackTraceString());
            throw new AuraHandledException('Error saving attachment: ' + e.getMessage());
        }
    }

    /*
    *********************************************************
    @Method Name    : getSettings
    @description    : Fetch AuthentiSign settings for SSO
    @return         : Map<String, String>
    ********************************************************
    */
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getSettings() {
        try {
            Setting__c setting = DataLayer.getSetting();
            if (setting == null) {
                throw new AuraHandledException('AuthentiSign settings not found.');
            }
            return new Map<String, String>{
                'externalId' => setting.Account_Id__c
            };
        } catch (Exception e) {
            System.debug('Error in getSettings: ' + e.getMessage() + '\n' + e.getStackTraceString());
            throw new AuraHandledException('Error fetching settings: ' + e.getMessage());
        }
    }
}