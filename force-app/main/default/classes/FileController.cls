public with sharing class FileController {
    @AuraEnabled
    public static String getFileContent(String contentDocumentId) {
        try {
            ContentVersion file = [
                SELECT VersionData
                FROM ContentVersion
                WHERE ContentDocumentId = :contentDocumentId
                AND IsLatest = true
                LIMIT 1
            ];
            return EncodingUtil.base64Encode(file.VersionData);
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving file content: ' + e.getMessage());
        }
    }
}