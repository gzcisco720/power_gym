'use server';

import crypto from 'crypto';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { getEmailService } from '@/lib/email/index';
import type { UploadConfig } from '@/lib/storage/types';

export interface CheckInSignatureResult {
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

export async function getCheckInSignatureAction(): Promise<CheckInSignatureResult> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const folder = 'check-ins';

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

export interface CreateCheckInInput {
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
}

export interface CreateCheckInState {
  error: string;
}

export async function createCheckInAction(input: CreateCheckInInput): Promise<CreateCheckInState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const memberId = session.user.id;
  const trainerId = session.user.trainerId;

  try {
    await connectDB();
    const repo = new MongoCheckInRepository();
    const now = new Date();

    await repo.create({
      ...input,
      memberId,
      trainerId: trainerId ?? '',
      submittedAt: now,
    });

    if (trainerId) {
      const userRepo = new MongoUserRepository();
      const trainer = await userRepo.findById(trainerId);
      if (trainer) {
        const emailService = getEmailService();
        const memberName = session.user.name ?? 'A member';
        try {
          await emailService.sendCheckInReceived({
            to: trainer.email,
            trainerName: `${trainer.firstName} ${trainer.lastName}`.trim(),
            memberName,
            submittedAt: now.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }),
          });
        } catch {
          // email failure should not block submission
        }
      }
    }

    return { error: '' };
  } catch {
    return { error: 'Failed to submit check-in' };
  }
}
