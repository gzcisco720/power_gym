/** @jest-environment node */
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockS3Send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
}));

import { auth } from '@/lib/auth/auth';
import { NextRequest } from 'next/server';

const mockAuth = jest.mocked(auth);

function makeUploadRequest(file?: File, folder = 'uploads'): NextRequest {
  const fd = new FormData();
  if (file) fd.append('file', file);
  fd.append('folder', folder);
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd });
}

describe('POST /api/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/upload/route');
    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(401);
  });

  it('uploads file to MinIO and returns secure_url', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockS3Send.mockResolvedValue({});
    process.env.MINIO_ENDPOINT = 'http://localhost:9000';
    process.env.MINIO_ACCESS_KEY = 'minioadmin';
    process.env.MINIO_SECRET_KEY = 'minioadmin';
    process.env.MINIO_BUCKET = 'power-gym';
    process.env.MINIO_PUBLIC_URL = 'http://localhost:9000';

    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const { POST } = await import('@/app/api/upload/route');
    const res = await POST(makeUploadRequest(file, 'check-ins'));
    const data = await res.json() as { secure_url?: string };

    expect(res.status).toBe(200);
    expect(data.secure_url).toMatch(/^http:\/\/localhost:9000\/power-gym\/check-ins\/.+\.jpg$/);
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when no file provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/upload/route');
    const res = await POST(makeUploadRequest());
    expect(res.status).toBe(400);
  });
});
