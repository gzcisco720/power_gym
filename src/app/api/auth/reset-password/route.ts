import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoPasswordResetTokenRepository } from '@/lib/repositories/password-reset-token.repository';
import { PasswordResetTokenModel } from '@/lib/db/models/password-reset-token.model';

export async function POST(req: Request): Promise<Response> {
  const { token, userId, newPassword } = (await req.json()) as {
    token: string;
    userId: string;
    newPassword: string;
  };

  if (!token || !userId || !newPassword) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await connectDB();

  const record = await PasswordResetTokenModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

  if (!record) {
    return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const valid = await bcrypt.compare(token, record.tokenHash);
  if (!valid) {
    return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const userRepo = new MongoUserRepository();
  const tokenRepo = new MongoPasswordResetTokenRepository();
  await userRepo.updatePassword(userId, passwordHash);
  await tokenRepo.markUsed(record._id.toString());

  return Response.json({ success: true });
}
