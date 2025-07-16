/*
*********************************************************
@Apex Class Name    : PDFResponse
@Created Date       : Unknown
@description        : Wrapper class for PDF response data
@author             : FFD Developer
@Modification Log   : 
* Modified Date      : Jul 12, 2025
* Modified By        : Grok
* Description        : Added AuraEnabled annotations, updated for non-CPQ and non-namespaced environment
*********************************************************
*/
public with sharing class PDFResponse {
    @AuraEnabled
    public String pdfStream { get; set; }
    
    @AuraEnabled
    public Blob pdfBlob { get; set; }
    
    @AuraEnabled
    public String fileName { get; set; }
}