import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth/auth';

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT!,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const folder = (formData.get('folder') as string | null) ?? 'uploads';
  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `${folder}/${randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET!,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: file.type,
    }),
  );

  const publicUrl = `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${key}`;
  return NextResponse.json({ secure_url: publicUrl });
}
