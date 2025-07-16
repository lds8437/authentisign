/*
*********************************************************
@Apex Class Name    : SignersRequest
@Created Date       : Sep 18, 2023
@description        : Wrapper class for signer data in AuthentiSign document submission
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Updated for non-CPQ and non-namespaced environment, added AuraEnabled annotations
* Modified Date      : Jul 13, 2025
* Modified By        : Grok
* Description        : Added with sharing, updated modification log
*********************************************************
*/
public with sharing class SignersRequest {
    @AuraEnabled
    public Data data { get; set; }

    public class Data {
        @AuraEnabled
        public String Name { get; set; }
        @AuraEnabled
        public String FirstName { get; set; }
        @AuraEnabled
        public String LastName { get; set; }
        @AuraEnabled
        public String Email { get; set; }
        @AuraEnabled
        public String Id { get; set; }
        @AuraEnabled
        public String Type { get; set; }
        @AuraEnabled
        public String Role { get; set; }
    }
}