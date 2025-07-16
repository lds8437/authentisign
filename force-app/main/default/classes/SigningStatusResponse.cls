/*
*********************************************************
@Apex Class Name    : SigningStatusResponse
@Created Date       : Sep 18, 2023
@description        : Wrapper class for AuthentiSign signing status response
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Added status field, updated for non-CPQ and non-namespaced environment
*********************************************************
*/
public with sharing class SigningStatusResponse {
    @AuraEnabled
    public Integer code { get; set; }
    
    @AuraEnabled
    public String message { get; set; }
    
    @AuraEnabled
    public List<String> details { get; set; }
    
    @AuraEnabled
    public String status { get; set; }
}