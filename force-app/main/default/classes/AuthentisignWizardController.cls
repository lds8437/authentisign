public with sharing class AuthentisignWizardController {
    @AuraEnabled(cacheable=true)
    public static List<ContentDocument> getAvailableDocuments() {
        return [SELECT Id, Title, FileType FROM ContentDocument WHERE FileType = 'PDF' ORDER BY Title LIMIT 100];
    }

    @AuraEnabled
    public static String uploadDocumentToAuthentisign(String contentDocumentId, String configId) {
        try {
            // Get ContentVersion to access file data
            ContentVersion cv = [SELECT Id, VersionData, Title FROM ContentVersion 
                                WHERE ContentDocumentId = :contentDocumentId AND IsLatest = true LIMIT 1];
            
            // Make API call to Authentisign
            AuthentisignApiService.DocumentResponse response = AuthentisignApiService.uploadDocument(
                cv.VersionData, cv.Title
            );
            
            // Update AuthentisignConfig__c
            AuthentisignConfig__c config = new AuthentisignConfig__c(
                Id = configId,
                DocumentId__c = contentDocumentId,
                ExternalDocumentId__c = response.documentId
            );
            update config;
            
            return response.documentId;
        } catch (Exception e) {
            throw new AuraHandledException('Error uploading document: ' + e.getMessage());
        }
    }
    @AuraEnabled(cacheable=true)
    public static List<SObject> getAvailableRecipients(String recordId) {
        List<SObject> recipients = new List<SObject>();
        // Example: Query Contacts related to an Account if recordId is provided
        if (String.isNotBlank(recordId)) {
            recipients.addAll([SELECT Id, Name, Email FROM Contact WHERE AccountId = :recordId LIMIT 50]);
        }
        recipients.addAll([SELECT Id, Name, Email FROM Lead LIMIT 50]);
        return recipients;
    }

    @AuraEnabled
    public static void addRecipientsToAuthentisign(String configId, String recipientsJson) {
        try {
            List<Recipient> recipients = (List<Recipient>) JSON.deserialize(recipientsJson, List<Recipient>.class);
            
            // Get AuthentisignConfig__c
            AuthentisignConfig__c config = [SELECT ExternalDocumentId__c FROM AuthentisignConfig__c WHERE Id = :configId LIMIT 1];
            
            // Make API call
            AuthentisignApiService.addRecipients(config.ExternalDocumentId__c, recipients);
            
            // Update config
            config.RecipientIds__c = JSON.serialize(recipients);
            update config;
        } catch (Exception e) {
            throw new AuraHandledException('Error adding recipients: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, List<String>> getAvailableFields() {
        Map<String, List<String>> objectFields = new Map<String, List<String>>();
        List<String> objects = new List<String>{'Account', 'Contact', 'Lead'};
        
        for (String obj : objects) {
            List<String> fields = new List<String>();
            Map<String, Schema.SObjectField> fieldMap = Schema.getGlobalDescribe()
                .get(obj).getDescribe().fields.getMap();
            for (String fieldName : fieldMap.keySet()) {
                fields.add(fieldName);
            }
            objectFields.put(obj, fields);
        }
        return objectFields;
    }

    @AuraEnabled
    public static void saveFieldMappings(String configId, String mappingsJson) {
        try {
            AuthentisignConfig__c config = new AuthentisignConfig__c(
                Id = configId,
                FieldMappings__c = mappingsJson
            );
            update config;
        } catch (Exception e) {
            throw new AuraHandledException('Error saving field mappings: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void placeFields(String configId, String fieldsJson) {
        try {
            List<FieldPosition> fields = (List<FieldPosition>) JSON.deserialize(fieldsJson, List<FieldPosition>.class);
            AuthentisignConfig__c config = [SELECT ExternalDocumentId__c FROM AuthentisignConfig__c WHERE Id = :configId LIMIT 1];
            
            // Make API call
            AuthentisignApiService.placeFields(config.ExternalDocumentId__c, fields);
            
            // Optionally store fields locally
            config.PlacedFields__c = fieldsJson;
            update config;
        } catch (Exception e) {
            throw new AuraHandledException('Error placing fields: ' + e.getMessage());
        }
    }
    @AuraEnabled
    public static Map<String, Object> getPreviewData(String configId) {
        try {
            AuthentisignConfig__c config = [SELECT DocumentId__c, RecipientIds__c, FieldMappings__c, PlacedFields__c 
                                        FROM AuthentisignConfig__c WHERE Id = :configId LIMIT 1];
            return new Map<String, Object>{
                'documentId' => config.DocumentId__c,
                'recipients' => JSON.deserializeUntyped(config.RecipientIds__c),
                'mappings' => JSON.deserializeUntyped(config.FieldMappings__c),
                'fields' => JSON.deserializeUntyped(config.PlacedFields__c)
            };
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving preview data: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void sendDocument(String configId) {
        try {
            AuthentisignConfig__c config = [SELECT ExternalDocumentId__c FROM AuthentisignConfig__c WHERE Id = :configId LIMIT 1];
            
            // Make API call
            AuthentisignApiService.sendDocument(config.ExternalDocumentId__c);
            
            // Update status
            config.Status__c = 'Sent';
            update config;
        } catch (Exception e) {
            throw new AuraHandledException('Error sending document: ' + e.getMessage());
        }
    }

    public class FieldPosition {
        public String fieldName;
        public Integer x;
        public Integer y;
    }

    public class Recipient {
        public String id;
        public String name;
        public String email;
        public String role;
    }
}