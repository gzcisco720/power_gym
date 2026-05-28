import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('MINIO_BUCKET') ?? 'power-gym';
    this.publicUrl =
      config.get<string>('MINIO_PUBLIC_URL') ?? 'http://localhost:9000';
    this.s3 = new S3Client({
      endpoint: config.get<string>('MINIO_ENDPOINT') ?? 'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey: config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async upload(
    buffer: Buffer,
    _originalName: string,
    contentType: string,
    folder = 'uploads',
  ): Promise<string> {
    if (!/^[a-z0-9-]+$/.test(folder)) {
      throw new BadRequestException('Invalid folder');
    }
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      throw new BadRequestException(`File type ${contentType} is not allowed`);
    }
    const key = `${folder}/${randomUUID()}.${ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentDisposition: 'attachment',
      }),
    );
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }
}
