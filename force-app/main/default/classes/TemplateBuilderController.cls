public with sharing class TemplateBuilderController {
    @AuraEnabled(cacheable=true)
    public static List<String> getSObjectFields(String sObjectName) {
        return new List<String>(Schema.getGlobalDescribe()
            .get(sObjectName).getDescribe()
            .fields.getMap().keySet());
    }

    @AuraEnabled(cacheable=true)
    public static List<Template__c> getTemplates() {
        return [SELECT Id, Name FROM Template__c ORDER BY CreatedDate DESC LIMIT 100];
    }

    @AuraEnabled
    public static Template__c getTemplateContent(String templateId) {
        return [SELECT Id, Name, Body__c, Object__c, FileType__c FROM Template__c WHERE Id = :templateId];
    }

    @AuraEnabled
    public static void saveTemplate(String name, String htmlBody, String objectName, String fileType) {
        Template__c t = new Template__c(
            Name = name,
            Body__c = htmlBody,
            Object__c = objectName,
            FileType__c = fileType
        );
        upsert t;
    }

    @AuraEnabled
    public static String resolveMergeFields(String objectName, String recordId, String templateHtml) {
        Map<String, Schema.SObjectField> fm = Schema.getGlobalDescribe()
            .get(objectName).getDescribe().fields.getMap();
        SObject rec = Database.query(
            'SELECT ' + String.join(new List<String>(fm.keySet()), ',') +
            ' FROM ' + objectName +
            ' WHERE Id = :recordId LIMIT 1');
        String res = templateHtml;
        for (String f : fm.keySet()) {
            String token = '{{!' + objectName + '.' + f + '}}';
            Object val = rec.get(f);
            res = res.replace(token, val != null ? String.valueOf(val) : '');
        }
        return res;
    }
}
