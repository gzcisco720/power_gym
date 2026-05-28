import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UploadService {
  constructor(private readonly storage: StorageService) {}

  async upload(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    return this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder,
    );
  }
}
