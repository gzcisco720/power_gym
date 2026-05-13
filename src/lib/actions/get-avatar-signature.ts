'use server';

import { auth } from '@/lib/auth/auth';
import type { UploadConfig } from '@/lib/storage/types';
import crypto from 'crypto';

export async function getAvatarSignatureAction(): Promise<UploadConfig> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const folder = 'avatars';
  const provider = process.env.UPLOAD_PROVIDER;

  if (provider === 'cloudinary') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey = process.env.CLOUDINARY_API_KEY!;
    const secret = process.env.CLOUDINARY_API_SECRET!;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest('hex');
    return {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      signature,
      timestamp,
      folder,
      cloudName,
    };
  }

  return { provider: 'local', uploadUrl: '/api/upload', folder };
}
