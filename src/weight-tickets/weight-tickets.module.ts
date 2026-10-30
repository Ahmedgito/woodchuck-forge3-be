import { HttpException, HttpStatus, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { AllConfigType } from 'src/config/config.type';
import fileConfig from 'src/files/config/file.config';
import { FileConfig, FileDriver } from 'src/files/config/file-config.type';
import { FilesModule } from 'src/files/files.module';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { JobSitesWastestreamsDumpstersModule } from 'src/job-sites-wastestreams-dumpsters/job-sites-wastestreams-dumpsters.module';
import { WeightTicketsController } from './weight-tickets.controller';
import { WeightTicketsService } from './weight-tickets.service';

const driver = (fileConfig() as FileConfig).driver;

const MulterRegistration = MulterModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AllConfigType>) => {
    const fileFilter = (
      _req: unknown,
      file: Express.Multer.File,
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|heic|heif|pdf)$/i)) {
        return callback(
          new HttpException(
            {
              status: HttpStatus.UNPROCESSABLE_ENTITY,
              errors: { file: 'cantUploadFileType' },
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          ),
          false,
        );
      }
      callback(null, true);
    };

    const limits = {
      fileSize: configService.get('file.maxFileSize', { infer: true }),
    };

    if (driver === FileDriver.LOCAL) {
      return {
        fileFilter,
        limits,
        storage: diskStorage({
          destination: './files',
          filename: (_req, file, callback) => {
            callback(
              null,
              `${randomStringGenerator()}.${file.originalname
                .split('.')
                .pop()
                ?.toLowerCase()}`,
            );
          },
        }),
      };
    }

    const s3 = new S3Client({
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

    return {
      fileFilter,
      limits,
      storage: multerS3({
        s3,
        bucket: configService.getOrThrow('file.awsDefaultS3Bucket', {
          infer: true,
        }),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (_req, file, callback) => {
          callback(
            null,
            `${randomStringGenerator()}.${file.originalname
              .split('.')
              .pop()
              ?.toLowerCase()}`,
          );
        },
      }),
    };
  },
});

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobSitesWasteStreamsEntity,
      JobSiteWastestreamsDumpstersEntity,
    ]),
    JobSitesWastestreamsDumpstersModule,
    FilesModule,
    MulterRegistration,
  ],
  controllers: [WeightTicketsController],
  providers: [WeightTicketsService],
})
export class WeightTicketsModule {}
