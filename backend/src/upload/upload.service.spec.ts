import { UploadService } from './upload.service';

describe('UploadService', () => {
  describe('upload', () => {
    it('forwards buffer, originalname, mimetype, and folder to storage.upload and returns its result', async () => {
      const expectedUrl = 'http://example.com/file.jpg';
      const mockStorage = {
        upload: jest.fn().mockResolvedValue(expectedUrl),
      };
      const svc = new UploadService(mockStorage as never);

      const file: Express.Multer.File = {
        buffer: Buffer.from('image-data'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        fieldname: 'file',
        encoding: '7bit',
        size: 10,
        stream: null as never,
        destination: '',
        filename: '',
        path: '',
      };

      const result = await svc.upload(file, 'photos');

      expect(mockStorage.upload).toHaveBeenCalledWith(
        file.buffer,
        file.originalname,
        file.mimetype,
        'photos',
      );
      expect(result).toBe(expectedUrl);
    });
  });
});
