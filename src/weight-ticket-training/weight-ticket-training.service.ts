import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { AllConfigType } from 'src/config/config.type';

/**
 * Dedicated S3 bucket for untrained weight ticket uploads (separate from
 * woodchuck-ai-folio3). Overridable via env for other environments where the
 * bucket name may differ.
 */
export const DEFAULT_WEIGHT_TICKET_TRAINING_BUCKET =
  'weight-ticket-training-images';

@Injectable()
export class WeightTicketTrainingService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.s3 = new S3Client({
      region: configService.getOrThrow('file.awsS3Region', { infer: true }),
      credentials: {
        accessKeyId: configService.getOrThrow('file.accessKeyId', {
          infer: true,
        }),
        secretAccessKey: configService.getOrThrow('file.secretAccessKey', {
          infer: true,
        }),
      },
    });
    this.bucket =
      process.env.AWS_WEIGHT_TICKET_TRAINING_S3_BUCKET ??
      DEFAULT_WEIGHT_TICKET_TRAINING_BUCKET;
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<number> {
    if (!files || files.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { files: 'selectFile' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await Promise.all(
      files.map((file) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
        const key = `${randomStringGenerator()}.${ext}`;
        return this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );
      }),
    );

    return files.length;
  }
}
