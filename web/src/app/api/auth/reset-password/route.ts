import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoPasswordResetTokenRepository } from '@/lib/repositories/password-reset-token.repository';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request): Promise<Response> {
  if (!checkRateLimit(req, 'reset-password', 5, 10 * 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { token, userId, newPassword } = (await req.json()) as {
    token: string;
    userId: string;
    newPassword: string;
  };

  if (!token || !userId || !newPassword) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await connectDB();

  const tokenRepo = new MongoPasswordResetTokenRepository();
  const record = await tokenRepo.findValidByUserId(userId);

  if (!record) {
    return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const valid = await bcrypt.compare(token, record.tokenHash);
  if (!valid) {
    return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const userRepo = new MongoUserRepository();
  await userRepo.updatePassword(userId, passwordHash);
  await tokenRepo.markUsed(record._id.toString());

  return Response.json({ success: true });
}
