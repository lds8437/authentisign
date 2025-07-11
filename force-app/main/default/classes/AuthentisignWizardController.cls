public with sharing class AuthentisignWizardController {

    @AuraEnabled
    public static void saveTemplate(String name, String body, String fileType, String objectApiName) {
        System.debug('saveTemplate: Received parameters - name=' + name + ', body length=' + (body != null ? body.length() : 0) + ', fileType=' + fileType + ', objectApiName=' + objectApiName);
        try {
            Template__c template = new Template__c(
                Name = name,
                Body__c = body,
                FileType__c = fileType,
                Object__c = objectApiName
            );
            insert template;
            System.debug('saveTemplate: Successfully inserted template with Id=' + template.Id);
        } catch (Exception e) {
            System.debug('saveTemplate Error: ' + e.getMessage() + ', StackTrace=' + e.getStackTraceString());
            throw new AuraHandledException('Error saving template: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<ContentDocument> getAvailableDocuments() {
        try {
            System.debug('getAvailableDocuments: Starting query for PDF ContentDocuments');
            List<ContentDocument> documents = [
                SELECT Id, Title, FileType 
                FROM ContentDocument 
                WHERE FileType = 'PDF' 
                ORDER BY Title ASC 
                LIMIT 100
            ];
            System.debug('getAvailableDocuments: Found ' + documents.size() + ' documents');
            System.debug('getAvailableDocuments: Documents=' + JSON.serialize(documents));
            return documents;
        } catch (Exception e) {
            System.debug('getAvailableDocuments Error: ' + e.getMessage() + ', StackTrace=' + e.getStackTraceString());
            throw new AuraHandledException('Error retrieving documents: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static String uploadDocumentToAuthentisign(String contentDocumentId, String configId) {
        try {
            System.debug('uploadDocumentToAuthentisign: contentDocumentId=' + contentDocumentId + ', configId=' + configId);
            ContentVersion cv = [
                SELECT Id, VersionData, Title 
                FROM ContentVersion 
                WHERE ContentDocumentId = :contentDocumentId 
                AND IsLatest = true 
                LIMIT 1
            ];
            
            AuthentisignApiService.DocumentResponse response = AuthentisignApiService.uploadDocument(
                cv.VersionData, cv.Title
            );
            
            AuthentisignConfig__c config = new AuthentisignConfig__c(
                Id = configId,
                DocumentId__c = contentDocumentId,
                ExternalDocumentId__c = response.documentId
            );
            update config;
            
            return response.documentId;
        } catch (Exception e) {
            String errorMsg = 'Error uploading document: ' + e.getMessage();
            if (e.getMessage().contains('named credential')) {
                errorMsg += '. Please contact your administrator to verify the "AuthentisignAPI" Named Credential configuration.';
            }
            System.debug('uploadDocumentToAuthentisign Error: ' + errorMsg);
            throw new AuraHandledException(errorMsg);
        }
    }

    @AuraEnabled
    public static String checkForDuplicateDocument(String fileName, String configId) {
        try {
            List<ContentDocumentLink> existingLinks = [
                SELECT ContentDocumentId 
                FROM ContentDocumentLink 
                WHERE ContentDocument.Title = :fileName 
                AND ContentDocument.FileType = 'PDF'
                AND LinkedEntityId = :configId
                LIMIT 1
            ];
            return existingLinks.isEmpty() ? null : existingLinks[0].ContentDocumentId;
        } catch (Exception e) {
            throw new AuraHandledException('Error checking for duplicate document: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static List<Recipient> getAvailableRecipients(String recordId, String objectType) {
        try {
            String query;
            if (objectType == 'Contact') {
                query = 'SELECT Id, Name, Email FROM Contact WHERE Email != null ORDER BY Name ASC LIMIT 50';
            } else if (objectType == 'Lead') {
                query = 'SELECT Id, Name, Email FROM Lead WHERE Email != null ORDER BY Name ASC LIMIT 50';
            } else {
                throw new AuraHandledException('Invalid object type: ' + objectType);
            }
            
            System.debug('getAvailableRecipients: objectType=' + objectType + ', recordId=' + recordId + ', query=' + query);
            List<SObject> records = Database.query(String.escapeSingleQuotes(query));
            System.debug('getAvailableRecipients: records size=' + records.size());
            System.debug('getAvailableRecipients: raw records=' + JSON.serialize(records));
            
            List<Recipient> recipients = new List<Recipient>();
            for (SObject rec : records) {
                Recipient r = new Recipient();
                r.id = String.valueOf(rec.get('Id'));
                r.name = String.valueOf(rec.get('Name'));
                r.email = String.valueOf(rec.get('Email'));
                recipients.add(r);
                System.debug('Recipient: id=' + r.id + ', name=' + r.name + ', email=' + r.email);
            }
            System.debug('getAvailableRecipients: returning recipients size=' + records.size() + ', recipients=' + JSON.serialize(recipients));
            return recipients;
        } catch (Exception e) {
            System.debug('getAvailableRecipients Error: ' + e.getMessage() + ', StackTrace=' + e.getStackTraceString());
            throw new AuraHandledException('Error retrieving recipients: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void addRecipientsToAuthentisign(String configId, String recipientsJson) {
        try {
            List<Recipient> recipients = (List<Recipient>) JSON.deserialize(recipientsJson, List<Recipient>.class);
            AuthentisignApiService.addRecipients(configId, recipients);
            AuthentisignConfig__c config = new AuthentisignConfig__c(
                Id = configId,
                RecipientsJson__c = recipientsJson
            );
            update config;
        } catch (Exception e) {
            String errorMsg = 'Error adding recipients: ' + e.getMessage();
            System.debug('addRecipientsToAuthentisign Error: ' + errorMsg);
            throw new AuraHandledException(errorMsg);
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<FieldDescriptor> getObjectFields(String objectName) {
        try {
            System.debug('getObjectFields: objectName=' + objectName);
            if (String.isBlank(objectName)) {
                throw new AuraHandledException('Object name is required');
            }

            Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
            if (sObjectType == null) {
                throw new AuraHandledException('Invalid object name: ' + objectName);
            }

            Map<String, Schema.SObjectField> fieldMap = sObjectType.getDescribe().fields.getMap();
            List<FieldDescriptor> fields = new List<FieldDescriptor>();

            for (String fieldName : fieldMap.keySet()) {
                Schema.DescribeFieldResult field = fieldMap.get(fieldName).getDescribe();
                if (field.isAccessible()) {
                    fields.add(new FieldDescriptor(
                        field.getLabel(),
                        field.getName()
                    ));
                }
            }

            fields.sort();
            System.debug('getObjectFields: Found ' + fields.size() + ' fields for ' + objectName);
            System.debug('getObjectFields: Fields=' + JSON.serialize(fields));
            return fields;
        } catch (Exception e) {
            System.debug('getObjectFields Error: ' + e.getMessage() + ', StackTrace=' + e.getStackTraceString());
            throw new AuraHandledException('Error retrieving fields: ' + e.getMessage());
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
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String email;
        @AuraEnabled public String role;
    }

    public class FieldDescriptor implements Comparable {
        @AuraEnabled public String label;
        @AuraEnabled public String apiName;

        public FieldDescriptor(String label, String apiName) {
            this.label = label;
            this.apiName = apiName;
        }

        public Integer compareTo(Object compareTo) {
            FieldDescriptor other = (FieldDescriptor) compareTo;
            return this.label.compareTo(other.label);
        }
    }
}