/*
*********************************************************
@Apex Class Name    : SObjectFieldPackage
@Created Date       : Unknown
@description        : Wrapper class for sObject field metadata
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Updated for compatibility with non-CPQ and non-namespaced environment, added AuraEnabled annotations
*********************************************************
*/
public with sharing class SObjectFieldPackage {
    @AuraEnabled
    public String query {get; set;}
    
    @AuraEnabled
    public List<String> sObjectFieldsList {get; set;}
    
    @AuraEnabled
    public Map<String, List<String>> participantList {get; set;}
    
    @AuraEnabled
    public Map<String, Map<String, String>> sObjectFieldsProperties {get; set;}
    
    @AuraEnabled
    public Map<String, String> userContactFieldMap {get; set;}
}