import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FileRepository } from '../../persistence/file.repository';
import { FileType } from 'src/files/domain/file';
import { FileUploadDto } from './dto/file.dto';
import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { isAllowedUploadImageName } from '../../../utils/allowed-upload-image-extensions';

@Injectable()
export class FilesS3PresignedService {
  private s3: S3Client;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: configService.get('file.awsS3Region', { infer: true }),
      credentials: {
        accessKeyId: configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    });
  }

  async create(
    file: FileUploadDto,
  ): Promise<{ file: FileType; uploadSignedUrl: string }> {
    if (!file) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'selectFile',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!isAllowedUploadImageName(file.fileName)) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: `cantUploadFileType`,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (
      file.fileSize >
      (this.configService.get('file.maxFileSize', {
        infer: true,
      }) || 0)
    ) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          error: 'Payload Too Large',
          message: 'File too large',
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const key = `${randomStringGenerator()}.${file.fileName
      .split('.')
      .pop()
      ?.toLowerCase()}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.getOrThrow('file.awsDefaultS3Bucket', {
        infer: true,
      }),
      Key: key,
      ContentLength: file.fileSize,
    });
    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const data = await this.fileRepository.create({
      path: key,
    });

    return {
      file: data,
      uploadSignedUrl: signedUrl,
    };
  }

  async uploadCameraImage(
    image: Buffer,
    fileName: string,
  ): Promise<string | null> {
    try {
      if (!image) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              file: 'file missing',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (!isAllowedUploadImageName(fileName)) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              file: `cantUploadFileType`,
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const cameraBucket = this.configService.getOrThrow(
        'file.awsCameraS3Bucket',
        {
          infer: true,
        },
      );

      const cameraFolder = this.configService.getOrThrow(
        'file.awsCameraS3Folder',
        {
          infer: true,
        },
      );

      const fileKey = `${cameraFolder}/${fileName}`;

      const uploadParams = {
        Bucket: cameraBucket,
        Key: fileKey,
        Body: image,
        ContentType: 'image/jpeg',
      };

      await this.s3.send(new PutObjectCommand(uploadParams));
      const imageUrl = `https://${cameraBucket}.s3.amazonaws.com/${fileKey}`;
      return imageUrl;
    } catch (error) {
      console.log('error', error);
      return null;
    }
  }

  async uploadUserPhoto(userId, file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'noPhotoProvided',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      // Generate unique filename for user photo
      const extension = file.mimetype.split('/').pop();
      const timestamp = new Date().getTime();
      const randomId = randomStringGenerator();

      const profileImagesBucket = this.configService.getOrThrow(
        'file.awsClientProfileS3Bucket',
        {
          infer: true,
        },
      );

      const clientProfileFolder = this.configService.getOrThrow(
        'file.awsClientProfileS3Folder',
        {
          infer: true,
        },
      );

      const filename = `${clientProfileFolder}/${userId}/${timestamp}-${randomId}.${extension}`;
      // Upload to S3
      const uploadParams = {
        Bucket: profileImagesBucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await this.s3.send(new PutObjectCommand(uploadParams));

      const publicUrl = `https://${profileImagesBucket}.s3.amazonaws.com/${filename}`;
      return publicUrl;
    } catch (error) {
      console.log('error', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          errors: {
            file: 'userPhotoUploadFailed',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUserPhoto(
    userId: string | number,
    photoUrl: string,
  ): Promise<void> {
    if (!photoUrl) return;
    try {
      // Extract bucket and key from the photoUrl
      const profileImagesBucket = this.configService.getOrThrow(
        'file.awsClientProfileS3Bucket',
        { infer: true },
      );
      const urlPrefix = `https://${profileImagesBucket}.s3.amazonaws.com/`;
      if (!photoUrl.startsWith(urlPrefix)) {
        throw new Error('Photo URL does not match expected bucket');
      }
      const key = photoUrl.substring(urlPrefix.length);
      const deleteParams = {
        Bucket: profileImagesBucket,
        Key: key,
      };
      await this.s3.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
      console.log('Failed to delete user photo from S3:', error);
      // Do not throw, just log
    }
  }
}
