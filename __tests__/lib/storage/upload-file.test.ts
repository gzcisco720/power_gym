/** @jest-environment node */
import { uploadFile } from '@/lib/storage/upload-file';
import type { UploadConfig } from '@/lib/storage/types';

global.fetch = jest.fn();
const mockFetch = jest.mocked(global.fetch);

describe('uploadFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs to local uploadUrl and returns secure_url', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'http://localhost:9000/power-gym/uploads/abc.jpg' }),
    } as Response);

    const config: UploadConfig = { provider: 'local', uploadUrl: '/api/upload', folder: 'uploads' };
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const url = await uploadFile(file, config);

    expect(url).toBe('http://localhost:9000/power-gym/uploads/abc.jpg');
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('/api/upload');
    expect((calledInit?.body as FormData).get('folder')).toBe('uploads');
  });

  it('POSTs to Cloudinary uploadUrl with signature params and returns secure_url', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/equipment/img.jpg' }),
    } as Response);

    const config: UploadConfig = {
      provider: 'cloudinary',
      uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload',
      apiKey: 'key',
      signature: 'sig',
      timestamp: 1234567890,
      folder: 'equipment',
      cloudName: 'demo',
    };
    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' });
    const url = await uploadFile(file, config);

    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/equipment/img.jpg');
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe(config.uploadUrl);
    const body = calledInit?.body as FormData;
    expect(body.get('api_key')).toBe('key');
    expect(body.get('signature')).toBe('sig');
  });

  it('throws when the server returns an error', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: { message: 'Upload failed' } }),
    } as Response);

    const config: UploadConfig = { provider: 'local', uploadUrl: '/api/upload', folder: 'uploads' };
    const file = new File(['data'], 'bad.jpg', { type: 'image/jpeg' });
    await expect(uploadFile(file, config)).rejects.toThrow('Upload failed');
  });
});
