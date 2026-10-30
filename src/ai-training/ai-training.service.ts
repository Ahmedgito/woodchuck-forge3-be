import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { AllConfigType } from 'src/config/config.type';
import { WOOD_TYPE_FOLDERS, VALID_FOLDER_NAMES } from './ai-training.constants';

@Injectable()
export class AiTrainingService {
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
    this.bucket = process.env.AWS_AI_S3_TRAINING_BUCKET ?? '';
  }

  async uploadImages(
    folderName: string,
    files: Express.Multer.File[],
  ): Promise<number> {
    if (!VALID_FOLDER_NAMES.includes(folderName)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errors: { folderName: 'Invalid wood type folder' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!files || files.length === 0) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { files: 'selectFile' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await Promise.all(
      files.map((file) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
        const key = `${date}/${folderName}/${randomStringGenerator()}.${ext}`;
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

  async getFolderCounts(): Promise<
    { folderName: string; displayName: string; count: number }[]
  > {
    // Single full-bucket scan — key structure: YYYY-MM-DD/{folderName}/{filename}
    const counts = new Map<string, number>(
      WOOD_TYPE_FOLDERS.map((f) => [f.folderName, 0]),
    );

    let continuationToken: string | undefined;
    do {
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of response.Contents ?? []) {
        if (!obj.Key) continue;
        // Key: "2026-04-02/T1 Pallets/abc123.jpg" → parts[1] = folderName
        const folder = obj.Key.split('/')[1];
        if (folder && counts.has(folder)) {
          counts.set(folder, (counts.get(folder) ?? 0) + 1);
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return WOOD_TYPE_FOLDERS.map((folder) => ({
      folderName: folder.folderName,
      displayName: folder.displayName,
      count: counts.get(folder.folderName) ?? 0,
    }));
  }
}
