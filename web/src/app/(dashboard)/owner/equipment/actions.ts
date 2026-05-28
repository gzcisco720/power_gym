'use server';

import crypto from 'crypto';
import { auth } from '@/lib/auth/auth';
import type { UploadConfig } from '@/lib/storage/types';

export interface EquipmentImageSignatureResult {
  error: string;
  config?: UploadConfig;
  /** @deprecated use config instead */
  signature?: string;
  /** @deprecated use config instead */
  timestamp?: number;
  /** @deprecated use config instead */
  cloudName?: string;
  /** @deprecated use config instead */
  apiKey?: string;
  /** @deprecated use config instead */
  folder?: string;
}

export async function getEquipmentImageSignatureAction(): Promise<EquipmentImageSignatureResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') return { error: 'Unauthorized' };

  const folder = 'equipment';

  if (process.env.UPLOAD_PROVIDER === 'local') {
    return {
      error: '',
      config: { provider: 'local', uploadUrl: '/api/upload', folder },
    };
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramStr = `folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(paramStr).digest('hex');

  return {
    error: '',
    config: {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      signature,
      timestamp,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    },
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  };
}
