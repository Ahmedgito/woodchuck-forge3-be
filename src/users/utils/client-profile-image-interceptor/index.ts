import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

export function UserPhotoFileInterceptor(fieldName = 'file') {
  return FileInterceptor(fieldName, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
        return callback(
          new BadRequestException('Only JPEG and PNG image files are allowed!'),
          false,
        );
      }
      callback(null, true);
    },
  });
}
