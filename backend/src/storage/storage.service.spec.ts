import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

let s3SendSpy: jest.SpyInstance;

beforeEach(() => {
  s3SendSpy = jest
    .spyOn(S3Client.prototype, 'send')
    .mockResolvedValue({} as never);
});

afterEach(() => s3SendSpy.mockRestore());

function makeService(): StorageService {
  const config = {
    get: jest.fn().mockImplementation((key: string) => {
      const vals: Record<string, string> = {
        MINIO_BUCKET: 'test-bucket',
        MINIO_PUBLIC_URL: 'http://minio:9000',
        MINIO_ENDPOINT: 'http://minio:9000',
        MINIO_ACCESS_KEY: 'key',
        MINIO_SECRET_KEY: 'secret',
      };
      return vals[key];
    }),
  };
  return new StorageService(config as never);
}

describe('StorageService', () => {
  describe('upload', () => {
    it('throws BadRequestException for a folder that fails the [a-z0-9-] regex', async () => {
      const svc = makeService();
      await expect(
        svc.upload(Buffer.from('data'), 'file.jpg', 'image/jpeg', 'My Folder'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for a disallowed content-type', async () => {
      const svc = makeService();
      await expect(
        svc.upload(
          Buffer.from('data'),
          'file.exe',
          'application/exe',
          'photos',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sends a PutObjectCommand and returns publicUrl/bucket/key with the correct extension', async () => {
      const svc = makeService();
      const result = await svc.upload(
        Buffer.from('data'),
        'photo.jpg',
        'image/jpeg',
        'photos',
      );
      expect(s3SendSpy).toHaveBeenCalledTimes(1);
      expect(result).toMatch(/^http:\/\/minio:9000\/test-bucket\//);
      expect(result).toMatch(/\.jpg$/);
    });
  });
});
