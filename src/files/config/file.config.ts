import { registerAs } from '@nestjs/config';
import { FileConfig, FileDriver } from 'src/files/config/file-config.type';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsEnum(FileDriver)
  @IsOptional()
  FILE_DRIVER: FileDriver;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  ACCESS_KEY_ID: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  SECRET_ACCESS_KEY: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  AWS_DEFAULT_S3_BUCKET: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  @IsOptional()
  AWS_DEFAULT_S3_URL: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  AWS_S3_REGION: string;
}

export default registerAs<FileConfig>('file', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    driver:
      (process.env.FILE_DRIVER as FileDriver | undefined) ?? FileDriver.LOCAL,
    accessKeyId: process.env.ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY ?? '',
    awsDefaultS3Bucket: process.env.AWS_DEFAULT_S3_BUCKET ?? '',
    awsDefaultS3Url: process.env.AWS_DEFAULT_S3_URL,
    awsS3Region: process.env.AWS_S3_REGION || 'us-east-1',
    maxFileSize: 10 * 1024 * 1024, // 10 MiB
    awsCameraS3Bucket: process.env.AWS_CAMERA_S3_BUCKET,
    awsCameraS3Folder: process.env.AWS_CAMERA_S3_FOLDER,
    awsClientProfileS3Bucket: process.env.AWS_CLIENT_PROFILE_S3_BUCKET,
    awsClientProfileS3Folder: process.env.AWS_CLIENT_PROFILE_S3_FOLDER,
    awsClientReportsS3Bucket:
      process.env.AWS_CLIENT_REPORTS_S3_BUCKET ?? 'client-reports',
  };
});
