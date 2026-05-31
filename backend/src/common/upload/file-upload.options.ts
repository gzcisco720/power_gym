import { BadRequestException } from '@nestjs/common';
import { diskStorage, Options } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { join } from 'path';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const fileUploadOptions: Options = {
  storage: diskStorage({
    destination: join(process.cwd(), 'public', 'uploads'),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
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
