@isTest
private class LayoutListCtrlTest {
    @TestSetup
    static void setup() {
        // Setup test data
        Setting__c setting = new Setting__c(
            Account_Id__c = '7f78e7e5-3938-47a9-82f6-ae2e9ca2e996',
            Endpoint__c = 'https://api.authentisign.com',
            Bearer_Token__c = 'test-token',
            Callback_Url__c = 'https://callback.example.com'
        );
        insert setting;

        Opportunity opp = new Opportunity(
            Name = 'Test Opportunity',
            StageName = 'Prospecting',
            CloseDate = Date.today()
        );
        insert opp;

        ContentVersion cv = new ContentVersion(
            Title = 'TestDoc.pdf',
            PathOnClient = 'TestDoc.pdf',
            VersionData = Blob.valueOf('Test content'),
            IsMajorVersion = true
        );
        insert cv;

        ContentDocument cd = [SELECT Id FROM ContentDocument WHERE LatestPublishedVersionId = :cv.Id LIMIT 1];
        ContentDocumentLink cdl = new ContentDocumentLink(
            ContentDocumentId = cd.Id,
            LinkedEntityId = opp.Id,
            ShareType = 'V'
        );
        insert cdl;
    }

    @isTest
    static void testGetSettings() {
        Test.startTest();
        System.debug(JSON.serialize(LayoutListCtrl.getSettings())); // Debug statement
        Test.stopTest();

        Map<String, String> settings = LayoutListCtrl.getSettings();
        System.assertEquals('7f78e7e5-3938-47a9-82f6-ae2e9ca2e996', settings.get('externalId'), 'External ID should match');
    }

    @isTest
    static void testGetLayouts() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());

        Test.startTest();
        LayoutResponse response = LayoutListCtrl.getLayouts(opp.Id, 'Opportunity');
        Test.stopTest();

        System.assertNotEquals(null, response, 'LayoutResponse should not be null');
        System.assertNotEquals(null, response.wrapper, 'Wrapper list should not be null');
        System.assertNotEquals(null, response.documents, 'Documents map should not be null');
    }

    @isTest
    static void testSaveAttachment() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());

        Test.startTest();
        String attachmentId = LayoutListCtrl.saveAttachment(opp.Id, '9f3a7828-6953-f011-8f7c-000d3a8a9962', 'Opportunity', true);
        Test.stopTest();

        System.assertNotEquals(null, attachmentId, 'Attachment ID should not be null');
        ContentDocumentLink cdl = [SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :opp.Id LIMIT 1];
        System.assertNotEquals(null, cdl, 'ContentDocumentLink should exist');
    }

    // Mock HTTP response
    private class MockHttpResponseGenerator implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('[{"id":"layout1","name":"Contract Layout","dateCreated":"2025-07-22T10:00:00Z","lastModified":"2025-07-22T10:00:00Z","roles":["Signer1"],"fields":["Field1"],"participants":[{"id":"p1","layoutId":"layout1","role":"Signer1","order":1,"dateCreated":"2025-07-22T10:00:00Z","layout":"Contract Layout"}]}]');
            res.setStatusCode(200);
            return res;
        }
    }
}