/*
*********************************************************
@Apex Class Name    : LayoutWrapper
@Created Date       : Dec 12, 2023
@description        : Wrapper class for layout response from API
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Updated for compatibility with non-CPQ and non-namespaced environment
*********************************************************
*/
public with sharing class LayoutWrapper {
    @AuraEnabled
    public String id { get; set; }
    @AuraEnabled
    public String name { get; set; }
    @AuraEnabled
    public DateTime dateCreated { get; set; }
    @AuraEnabled
    public DateTime lastModified { get; set; }
    @AuraEnabled
    public List<LayoutParticipant> layoutParticipants { get; set; }
    @AuraEnabled
    public List<String> roles { get; set; }
    @AuraEnabled
    public List<String> fields { get; set; }
}