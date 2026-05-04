/** @jest-environment node */
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('getEquipmentImageSignatureAction - local provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.UPLOAD_PROVIDER = 'local';
  });

  afterEach(() => {
    delete process.env.UPLOAD_PROVIDER;
  });

  it('returns local upload config', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const { getEquipmentImageSignatureAction } = await import(
      '@/app/(dashboard)/owner/equipment/actions'
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await getEquipmentImageSignatureAction()) as any;
    expect(result.error).toBe('');
    expect(result.config?.provider).toBe('local');
    expect(result.config?.uploadUrl).toBe('/api/upload');
    expect(result.config?.folder).toBe('equipment');
  });

  it('returns error when not owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { getEquipmentImageSignatureAction } = await import(
      '@/app/(dashboard)/owner/equipment/actions'
    );
    const result = await getEquipmentImageSignatureAction();
    expect(result.error).toBeTruthy();
  });
});
