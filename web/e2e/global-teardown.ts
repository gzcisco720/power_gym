import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.e2e') });

export default async function globalTeardown(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;

  await mongoose.connect(uri);
  await mongoose.connection.db!.dropDatabase();
  await mongoose.disconnect();
}
