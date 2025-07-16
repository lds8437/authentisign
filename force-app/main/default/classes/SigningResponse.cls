/*
*********************************************************
@Apex Class Name    : SigningResponse
@Created Date       : Sep 18, 2023
@description        : Wrapper class for AuthentiSign signing response
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Added AuraEnabled annotations, updated for non-CPQ and non-namespaced environment
*********************************************************
*/
public with sharing class SigningResponse {
    @AuraEnabled
    public String id { get; set; }
    @AuraEnabled
    public String name { get; set; }
    @AuraEnabled
    public String accountId { get; set; }
    @AuraEnabled
    public Integer statusId { get; set; }
    @AuraEnabled
    public Boolean isOrdered { get; set; }
    @AuraEnabled
    public DateTime dateCreated { get; set; }
    @AuraEnabled
    public DateTime lastModified { get; set; }
    @AuraEnabled
    public DateTime expirationDate { get; set; }
    @AuraEnabled
    public Integer idPosition { get; set; }
    @AuraEnabled
    public String reminderDay { get; set; }
    @AuraEnabled
    public String reminderHour { get; set; }
    @AuraEnabled
    public String transactionId { get; set; }
    @AuraEnabled
    public String technologyProvider { get; set; }
    @AuraEnabled
    public String callbackUrl { get; set; }
}