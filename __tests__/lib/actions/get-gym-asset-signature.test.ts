import { getGymAssetSignatureAction } from '@/lib/actions/get-gym-asset-signature';
import { auth } from '@/lib/auth/auth';

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user1' } }),
}));

describe('getGymAssetSignatureAction', () => {
  beforeEach(() => {
    delete process.env.UPLOAD_PROVIDER;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  it('returns local config for non-cloudinary provider', async () => {
    const config = await getGymAssetSignatureAction('gym-logos');
    expect(config.provider).toBe('local');
    expect(config.folder).toBe('gym-logos');
    expect(config.uploadUrl).toBe('/api/upload');
  });

  it('returns config with specified gym-backgrounds folder', async () => {
    const config = await getGymAssetSignatureAction('gym-backgrounds');
    expect(config.provider).toBe('local');
    expect(config.folder).toBe('gym-backgrounds');
    expect(config.uploadUrl).toBe('/api/upload');
  });

  it('throws when user is not authenticated', async () => {
    jest.mocked(auth).mockResolvedValueOnce(null);

    await expect(getGymAssetSignatureAction('gym-logos')).rejects.toThrow(
      'Unauthorized',
    );
  });

  it('returns cloudinary config with signature when provider is cloudinary', async () => {
    process.env.UPLOAD_PROVIDER = 'cloudinary';
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-api-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';

    const config = await getGymAssetSignatureAction('gym-logos');

    expect(config.provider).toBe('cloudinary');
    expect(config.folder).toBe('gym-logos');
    expect(config.uploadUrl).toBe(
      'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
    );
    expect(config.apiKey).toBe('test-api-key');
    expect(config.cloudName).toBe('test-cloud');
    expect(config).toHaveProperty('signature');
    expect(config).toHaveProperty('timestamp');
  });
});
