import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { format } from 'date-fns';
import { AllConfigType } from 'src/config/config.type';
import { AttachmentFile } from 'src/utils/zip-attachments.util';

export interface UploadedReportArchive {
  filename: string;
  key: string;
  /** Permanent backend URL that redirects to a fresh presigned S3 URL. */
  downloadUrl: string;
}

export const REPORT_ARCHIVE_KEY_PREFIX = 'reports/';

export interface ReportDownloadLink {
  filename: string;
  url: string;
}

/**
 * Stores report archives in the client-reports S3 bucket and builds permanent
 * download links. Presigned S3 URLs expire after at most 7 days, so emails
 * contain a backend URL that redirects to a freshly signed URL on every click,
 * keeping links valid indefinitely (1+ years).
 */
@Injectable()
export class ReportS3StorageService {
  private readonly logger = new Logger(ReportS3StorageService.name);
  private s3Client?: S3Client;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: this.configService.get('file.awsS3Region', { infer: true }),
        credentials: {
          accessKeyId: this.configService.getOrThrow('file.accessKeyId', {
            infer: true,
          }),
          secretAccessKey: this.configService.getOrThrow(
            'file.secretAccessKey',
            { infer: true },
          ),
        },
      });
    }
    return this.s3Client;
  }

  private getBucket(): string {
    return this.configService.getOrThrow('file.awsClientReportsS3Bucket', {
      infer: true,
    });
  }

  async uploadReportArchive(
    attachment: AttachmentFile,
  ): Promise<UploadedReportArchive> {
    // The UUID segment makes the key (and therefore the download link) unguessable.
    const key = `${REPORT_ARCHIVE_KEY_PREFIX}${format(new Date(), 'yyyy-MM')}/${randomUUID()}/${attachment.filename}`;

    // Stat BEFORE creating the read stream: if the file is missing, this throws
    // synchronously and no stream is ever created. Creating the stream first
    // (and only then hitting a throw) would orphan a read stream whose async
    // 'error' event has no listener — an unhandled 'error' crashes the process.
    const contentLength = fs.statSync(attachment.path).size;
    const body = fs.createReadStream(attachment.path);
    // Defensive: never let a read error (e.g. the file is deleted mid-upload)
    // surface as an uncaught 'error' event. The SDK still rejects the send().
    body.on('error', (err) => {
      this.logger.warn(
        `Read stream error for ${attachment.path}: ${err.message}`,
      );
    });

    await this.getS3Client().send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: body,
        ContentLength: contentLength,
        ContentType: 'application/octet-stream',
      }),
    );

    this.logger.log(
      `Uploaded report archive to s3://${this.getBucket()}/${key}`,
    );

    return {
      filename: attachment.filename,
      key,
      downloadUrl: this.buildDownloadUrl(key),
    };
  }

  buildDownloadUrl(key: string): string {
    // BACKEND_DOMAIN may be configured with a trailing slash; normalize so we
    // don't emit "domain//api/..." which Express rejects with a 404.
    const backendDomain = this.configService
      .getOrThrow('app.backendDomain', { infer: true })
      .replace(/\/+$/, '');
    const apiPrefix = this.configService.getOrThrow('app.apiPrefix', {
      infer: true,
    });
    return `${backendDomain}/${apiPrefix}/v1/report-downloads/file?key=${encodeURIComponent(key)}`;
  }

  /**
   * Returns true if the report object still exists in S3. Emailed links are
   * permanent, but the underlying object can be removed (manual deletion or an
   * S3 lifecycle rule), so the download endpoint checks existence before
   * redirecting and can show a friendly "no longer available" message instead
   * of a raw S3 error.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.getS3Client().send(
        new HeadObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
        }),
      );
      return true;
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode;
      if (err?.name === 'NotFound' || status === 404 || status === 403) {
        return false;
      }
      // Unexpected error (network/permissions) — surface it so the caller can
      // decide, rather than masking it as a missing file.
      throw err;
    }
  }

  async getPresignedDownloadUrl(key: string): Promise<string> {
    const filename = key.split('/').pop() || 'report.zip';
    const command = new GetObjectCommand({
      Bucket: this.getBucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });
    return getSignedUrl(this.getS3Client(), command, { expiresIn: 3600 });
  }
}
