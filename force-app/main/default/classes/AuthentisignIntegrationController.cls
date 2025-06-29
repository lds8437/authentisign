public with sharing class AuthentisignIntegrationController {
    @AuraEnabled(cacheable=false)
    public static String getSigningUrl(String signingId, String externalId) {
        // Base URL and version
        String baseUrl = 'https://api.authentisign.com/api';
        String version = 'v1';
        
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
        // Use the working JWT token from Authentisign settings
        String jwtToken = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIyODNjZjIyNC0zZmJhLTQ1OWItYTdiMy0wOTk1OGUyMGY0MTciLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9zeXN0ZW0iOiJFeHRlcm5hbCIsImFjdG9ydCI6ImNkNTE1MGFmLTE5NjUtNDdjNS1hZDJjLTRiNzk1NDY5MzdjMyIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL3NpZCI6IjM3MDkyNmFkLTMzZTQtNGNjYy1iNGIzLTI3OWNjNjViN2UyMiIsIm5iZiI6MTc0NjEwOTE5MiwiZXhwIjoyMDYxNjQxOTkyLCJpYXQiOjE3NDYxMDkxOTIsImlzcyI6ImF1dGhlbnRpc2lnbiIsImF1ZCI6ImF1dGhlbnRpc2lnbl9leHRlcm5hbCJ9.Bly64sSBx5KKugcQTnGA5Q35ABnjec9eApeqGajGFnhv-Xx7P1IS2br-Wwiscj5-XF72t0zsIOgStFwSoYl2wA';
        request.setHeader('Authorization', 'Bearer ' + jwtToken);
        // Add externalId header as used in Postman
        request.setHeader('externalId', 'cd5150af-1965-47c5-ad2c-4b79546937c3');
        
        HttpResponse response = null; // Declare outside try block
        try {
            System.debug('Sending HTTP request to: ' + endpoint);
            // Removed getHeaderKeys() as it’s not supported for HttpRequest; log specific headers if needed
            // System.debug('Request Header Authorization: ' + request.getHeader('Authorization'));
            // System.debug('Request Header externalId: ' + request.getHeader('externalId'));
            response = http.send(request);
            System.debug('HTTP Response Status: ' + response.getStatus());
            System.debug('HTTP Response Status Code: ' + response.getStatusCode());
            System.debug('HTTP Response Body: ' + response.getBody());
            // Log response headers for authentication clues
            Map<String, String> responseHeaders = response.getHeaderKeys() != null ? new Map<String, String>() : null;
            if (responseHeaders != null) {
                for (String key : response.getHeaderKeys()) {
                    responseHeaders.put(key, response.getHeader(key));
                }
                System.debug('HTTP Response Headers: ' + responseHeaders);
            }
            
            if (response.getStatusCode() == 200) {
                // Parse JSON response to extract SSO URL
                Map<String, Object> result = (Map<String, Object>)JSON.deserializeUntyped(response.getBody());
                String ssoUrl = (String)result.get('sso');
                if (String.isBlank(ssoUrl)) {
                    throw new AuraHandledException('No SSO URL found in response');
                }
                System.debug('Retrieved SSO URL: ' + ssoUrl);
                return ssoUrl;
            } else {
                System.debug('API call failed with status code: ' + response.getStatusCode() + ' - ' + response.getBody());
                throw new AuraHandledException('Authentisign API Error: HTTP ' + response.getStatusCode() + ' - ' + response.getBody());
            }
        } catch (Exception e) {
            System.debug('Exception during API call: ' + e.getMessage() + ' - Stack Trace: ' + e.getStackTraceString());
            throw new AuraHandledException('Error calling Authentisign API: ' + e.getMessage() + ' - Response: ' + (response?.getBody() ?? 'No response'));
        }
    }
}