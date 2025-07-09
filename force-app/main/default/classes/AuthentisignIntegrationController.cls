public with sharing class AuthentisignIntegrationController {
    @AuraEnabled(cacheable=false)
    public static String getSigningUrl(String signingId, String externalId) {
        // Query Custom Metadata for configuration
        Authentisign_Config__mdt config = [
            SELECT JWT_Token__c, Base_URL__c, Version__c
            FROM Authentisign_Config__mdt
            WHERE DeveloperName = 'Default_Config'
            LIMIT 1
        ];

        // Use config values
        String baseUrl = config.Base_URL__c != null ? config.Base_URL__c : 'https://api.authentisign.com';
        String version = config.Version__c != null ? config.Version__c : 'v1';
        String jwtToken = config.JWT_Token__c;

        // Construct redirect URL using URL.getOrgDomainUrl()
        String orgDomain = URL.getOrgDomainUrl().toExternalForm();
        String redirectUrl = orgDomain + '/apex/AuthentisignReturnPage';
        
        // Construct the API endpoint
        String endpoint = baseUrl + '/' + version + '/sso/signing/' + signingId + '?redirectUrl=' + EncodingUtil.urlEncode(redirectUrl, 'UTF-8');
        
        // Perform HTTP GET request
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(endpoint);
        request.setMethod('GET');
        request.setHeader('Authorization', 'Bearer ' + jwtToken);
        request.setHeader('externalId', externalId != null ? externalId : 'cd5150af-1965-47c5-ad2c-4b79546937c3');
        
        HttpResponse response = null;
        try {
            System.debug('Sending HTTP request to: ' + endpoint);
            response = http.send(request);
            System.debug('HTTP Response Status: ' + response.getStatus());
            System.debug('HTTP Response Status Code: ' + response.getStatusCode());
            System.debug('HTTP Response Body: ' + response.getBody());
            Map<String, String> responseHeaders = response.getHeaderKeys() != null ? new Map<String, String>() : null;
            if (responseHeaders != null) {
                for (String key : response.getHeaderKeys()) {
                    responseHeaders.put(key, response.getHeader(key));
                }
                System.debug('HTTP Response Headers: ' + responseHeaders);
            }
            
            if (response.getStatusCode() == 200) {
                Map<String, Object> result = (Map<String, Object>)JSON.deserializeUntyped(response.getBody());
                String ssoUrl = (String)result.get('sso');
                if (String.isBlank(ssoUrl)) {
                    throw new AuraHandledException('No SSO URL found in response');
                }
                System.debug('Retrieved SSO URL: ' + ssoUrl);
                return ssoUrl;
            } else {
                throw new AuraHandledException('Authentisign API Error: HTTP ' + response.getStatusCode() + ' - ' + response.getBody());
            }
        } catch (Exception e) {
            System.debug('Exception during API call: ' + e.getMessage() + ' - Stack Trace: ' + e.getStackTraceString());
            throw new AuraHandledException('Error calling Authentisign API: ' + e.getMessage() + ' - Response: ' + (response?.getBody() ?? 'No response'));
        }
    }
}