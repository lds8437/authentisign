/*
*********************************************************
@Apex Class Name    : LayoutParticipant
@Created Date       : Dec 12, 2023
@description        : Wrapper class used in LayoutWrapper class
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 11, 2025
* Modified By        : Grok
* Description        : Updated for compatibility with non-CPQ and non-namespaced environment
*********************************************************
*/
public with sharing class LayoutParticipant {
    /*
     * @description id
     * @return String
     */
    @AuraEnabled
    public String id { get; set; }
    /*
     * @description layoutId
     * @return String
     */
    @AuraEnabled
    public String layoutId { get; set; }
    /*
     * @description role
     * @return String
     */
    @AuraEnabled
    public String role { get; set; }
    /*
     * @description order
     * @return Integer
     */
    @AuraEnabled
    public Integer order { get; set; }
    /*
     * @description dateCreated
     * @return DateTime
     */
    @AuraEnabled
    public DateTime dateCreated { get; set; }
    /*
     * @description layout
     * @return String
     */
    @AuraEnabled
    public String layout { get; set; }
}