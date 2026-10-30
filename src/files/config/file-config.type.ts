export enum FileDriver {
  LOCAL = 'local',
  S3 = 's3',
  S3_PRESIGNED = 's3-presigned',
}

export type FileConfig = {
  driver: FileDriver;
  accessKeyId?: string;
  secretAccessKey?: string;
  awsDefaultS3Bucket?: string;
  awsDefaultS3Url?: string;
  awsS3Region?: string;
  maxFileSize: number;
  awsCameraS3Bucket?: string;
  awsCameraS3Folder?: string;
  awsClientProfileS3Bucket?: string;
  awsClientProfileS3Folder?: string;
  awsClientReportsS3Bucket: string;
};
