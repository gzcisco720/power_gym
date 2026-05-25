import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoPasswordResetTokenRepository } from '@/lib/repositories/password-reset-token.repository';
import { getEmailService } from '@/lib/email/index';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request): Promise<Response> {
  if (!checkRateLimit(req, 'forgot-password', 3, 10 * 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { email } = (await req.json()) as { email: string };

  await connectDB();
  const userRepo = new MongoUserRepository();
  const user = await userRepo.findByEmail(email?.toLowerCase()?.trim() ?? '');

  if (!user) {
    return Response.json({ success: true });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const tokenRepo = new MongoPasswordResetTokenRepository();
  await tokenRepo.create(user._id.toString(), tokenHash, expiresAt);

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&id=${user._id.toString()}`;

  await getEmailService().sendPasswordReset({ to: user.email, resetUrl });

  return Response.json({ success: true });
}
