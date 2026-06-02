import * as crypto from 'crypto';
import { buildUploadSignature } from './upload-signature';

describe('buildUploadSignature', () => {
  describe('with cloudinary args', () => {
    it('returns sha1 of "folder=equipment&timestamp=<ts>"+secret and correct folder/cloudName/apiKey', () => {
      const secret = 'test-secret';
      const cloudName = 'my-cloud';
      const apiKey = 'my-api-key';
      const timestamp = 1700000000;

      const result = buildUploadSignature({
        secret,
        cloudName,
        apiKey,
        timestamp,
      });

      const expectedSig = crypto
        .createHash('sha1')
        .update(`folder=equipment&timestamp=${timestamp}${secret}`)
        .digest('hex');

      expect(result.signature).toBe(expectedSig);
      expect(result.folder).toBe('equipment');
      expect(result.cloudName).toBe(cloudName);
      expect(result.apiKey).toBe(apiKey);
      expect(result.timestamp).toBe(timestamp);
    });
  });
});
