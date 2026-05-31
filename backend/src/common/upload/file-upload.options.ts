import { BadRequestException } from '@nestjs/common';
import { diskStorage, Options } from 'multer';
import { randomUUID } from 'crypto';
import { join } from 'path';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const fileUploadOptions: Options = {
  storage: diskStorage({
    destination: join(process.cwd(), 'public', 'uploads'),
    filename: (_req, file, cb) => {
      const ext = MIME_TO_EXT[file.mimetype];
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!MIME_TO_EXT[file.mimetype]) {
      return cb(
        new BadRequestException('Only JPEG, PNG, and WebP images are allowed'),
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
};
