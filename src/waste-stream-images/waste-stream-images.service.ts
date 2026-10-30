import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { WasteStreamImageEntity } from './infrastructure/persistence/relational/entities/waste-stream-image.entity';
import { CreateWasteStreamImageDto } from './dto/create-waste-stream-image.dto';
import { UpdateConfidenceDto } from './dto/update-confidence.dto';
import { AiStatus } from './enums/ai-status.enum';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { FileEntity } from 'src/files/infrastructure/persistence/relational/entities/file.entity';
import fileConfig from 'src/files/config/file.config';
import { FileConfig, FileDriver } from 'src/files/config/file-config.type';
import {
  parseImageMetadata,
  resolveLocationVerification,
} from './utils/image-metadata.util';

const MAX_IMAGES_PER_WASTE_STREAM = 4;

@Injectable()
export class WasteStreamImagesService {
  private readonly logger = new Logger(WasteStreamImagesService.name);
  private readonly fileDriver: FileDriver;
  private readonly s3Bucket: string;
  private readonly s3Client: S3Client | null;

  constructor(
    @InjectRepository(WasteStreamImageEntity)
    private readonly imageRepo: Repository<WasteStreamImageEntity>,
    @InjectRepository(JobSitesWasteStreamsEntity)
    private readonly jwsRepo: Repository<JobSitesWasteStreamsEntity>,
    @InjectRepository(JobSiteEntity)
    private readonly jobSiteRepo: Repository<JobSiteEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
  ) {
    const cfg = fileConfig() as FileConfig;
    this.fileDriver = cfg.driver;
    this.s3Bucket = cfg.awsDefaultS3Bucket ?? '';
    this.s3Client =
      this.fileDriver === FileDriver.S3 ||
      this.fileDriver === FileDriver.S3_PRESIGNED
        ? new S3Client({
            region: cfg.awsS3Region ?? '',
            credentials: {
              accessKeyId: cfg.accessKeyId ?? '',
              secretAccessKey: cfg.secretAccessKey ?? '',
            },
          })
        : null;
  }

  async findByJobsiteWasteStream(
    jobsiteWasteStreamId: number,
    latestOnly = true,
  ): Promise<WasteStreamImageEntity[]> {
    const where: any = { jobsiteWasteStreamId };
    if (latestOnly) where.isLatest = true;
    const images = await this.imageRepo.find({
      where,
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });

    const acceptedImages: WasteStreamImageEntity[] = [];
    for (const image of images) {
      if (this.isRejectedConfidenceValue(image.aiConfidenceLevel)) {
        await this.deleteImageAndFile(image);
        continue;
      }
      acceptedImages.push(image);
    }

    return acceptedImages;
  }

  async create(
    dto: CreateWasteStreamImageDto,
    uploadedById: number,
  ): Promise<WasteStreamImageEntity> {
    const jws = await this.jwsRepo.findOne({
      where: { id: dto.jobsiteWasteStreamId },
      withDeleted: true,
    });
    if (!jws) {
      throw new NotFoundException(
        `Waste stream assignment ${dto.jobsiteWasteStreamId} not found`,
      );
    }

    const existing = await this.imageRepo.count({
      where: { jobsiteWasteStreamId: dto.jobsiteWasteStreamId, isLatest: true },
    });
    if (existing >= MAX_IMAGES_PER_WASTE_STREAM) {
      throw new BadRequestException(
        `Maximum of ${MAX_IMAGES_PER_WASTE_STREAM} images allowed per waste stream`,
      );
    }

    const metadataFields = await this.buildMetadataFields(dto, jws.jobSiteId);

    const image = this.imageRepo.create({
      jobsiteWasteStreamId: dto.jobsiteWasteStreamId,
      jobSiteId: jws.jobSiteId,
      wasteStreamId: jws.wasteStreamId,
      fileId: dto.fileId,
      displayOrder: dto.displayOrder,
      uploadedById,
      uploadedAt: new Date(),
      aiStatus: AiStatus.PENDING,
      isLatest: true,
      ...metadataFields,
    });

    return this.imageRepo.save(image);
  }

  async replace(
    existingId: string,
    dto: CreateWasteStreamImageDto,
    uploadedById: number,
  ): Promise<WasteStreamImageEntity> {
    const existing = await this.imageRepo.findOne({
      where: { id: existingId, isLatest: true },
    });
    if (!existing) {
      throw new NotFoundException(`Image ${existingId} not found`);
    }

    await this.imageRepo.update(existingId, { isLatest: false });

    const jws = await this.jwsRepo.findOne({
      where: { id: dto.jobsiteWasteStreamId },
      withDeleted: true,
    });

    const metadataFields = await this.buildMetadataFields(dto, jws!.jobSiteId);

    const newImage = this.imageRepo.create({
      jobsiteWasteStreamId: dto.jobsiteWasteStreamId,
      jobSiteId: jws!.jobSiteId,
      wasteStreamId: jws!.wasteStreamId,
      fileId: dto.fileId,
      displayOrder: existing.displayOrder,
      uploadedById,
      uploadedAt: new Date(),
      aiStatus: AiStatus.PENDING,
      isLatest: true,
      replacedById: existingId,
      ...metadataFields,
    });

    return this.imageRepo.save(newImage);
  }

  async hardDelete(id: string): Promise<void> {
    const image = await this.imageRepo.findOne({
      where: { id, isLatest: true },
    });
    if (!image) {
      throw new NotFoundException(`Image ${id} not found`);
    }
    await this.deleteImageAndFile(image);
  }

  async deleteById(id: string): Promise<void> {
    const image = await this.imageRepo.findOne({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Image ${id} not found`);
    }
    await this.deleteImageAndFile(image);
  }

  async updateConfidence(
    id: string,
    dto: UpdateConfidenceDto,
  ): Promise<WasteStreamImageEntity> {
    const image = await this.imageRepo.findOne({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Image ${id} not found`);
    }
    image.adminConfidenceOverride = dto.adminConfidenceOverride;
    return this.imageRepo.save(image);
  }

  async getStatus(id: string): Promise<{
    id: string;
    aiStatus: AiStatus;
    aiConfidenceLevel: number | null;
    aiVerified: boolean | null;
  }> {
    const image = await this.imageRepo.findOne({
      where: { id },
      select: ['id', 'aiStatus', 'aiConfidenceLevel', 'aiVerified'],
    });
    if (!image) {
      throw new NotFoundException(
        `Image ${id} was not found. It may have been rejected and removed because confidence level was 0.`,
      );
    }

    if (this.isRejectedConfidenceValue(image.aiConfidenceLevel)) {
      await this.deleteById(id);
      throw new NotFoundException(
        `Image ${id} was rejected and removed because confidence level was 0.`,
      );
    }

    return {
      id: image.id,
      aiStatus: image.aiStatus,
      aiConfidenceLevel: image.aiConfidenceLevel,
      aiVerified: image.aiVerified,
    };
  }

  async setAiResult(
    id: string,
    result: {
      aiStatus: AiStatus;
      aiConfidenceLevel: number | null;
      aiVerified: boolean | null;
      aiResponseRaw: Record<string, any> | null;
    },
  ): Promise<void> {
    await this.imageRepo.update(id, result);
  }

  async setAiProcessing(id: string): Promise<void> {
    await this.imageRepo.update(id, { aiStatus: AiStatus.PROCESSING });
  }

  async findLatestByJobSiteId(
    jobSiteId: number,
  ): Promise<WasteStreamImageEntity[]> {
    return this.imageRepo.find({
      where: { jobSiteId, isLatest: true },
      order: { jobsiteWasteStreamId: 'ASC', displayOrder: 'ASC' },
    });
  }

  private async buildMetadataFields(
    dto: CreateWasteStreamImageDto,
    jobSiteId: number,
  ): Promise<
    Pick<
      WasteStreamImageEntity,
      | 'capturedAt'
      | 'latitude'
      | 'longitude'
      | 'metadataSource'
      | 'distanceFromJobSiteMeters'
      | 'locationVerified'
    >
  > {
    const metadata = parseImageMetadata(dto);

    const jobSite = await this.jobSiteRepo.findOne({
      where: { id: jobSiteId },
      relations: ['address'],
    });

    const verification = resolveLocationVerification(
      metadata,
      jobSite?.address?.lat,
      jobSite?.address?.lng,
    );

    return {
      capturedAt: metadata.capturedAt,
      latitude: metadata.latitude,
      longitude: metadata.longitude,
      metadataSource: metadata.metadataSource,
      distanceFromJobSiteMeters: verification.distanceFromJobSiteMeters,
      locationVerified: verification.locationVerified,
    };
  }

  private async deleteImageAndFile(
    image: WasteStreamImageEntity,
  ): Promise<void> {
    const imageCountForFile = await this.imageRepo.count({
      where: { fileId: image.fileId },
    });
    const shouldDeleteUnderlyingFile = imageCountForFile <= 1;

    if (shouldDeleteUnderlyingFile) {
      await this.deleteFileAssetFromStorage(image.fileId);
    }

    await this.imageRepo.delete(image.id);

    if (shouldDeleteUnderlyingFile) {
      await this.fileRepo.delete(image.fileId);
    }
  }

  private async deleteFileAssetFromStorage(fileId: string): Promise<void> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) return;

    if (!this.s3Client || !this.s3Bucket) return;

    const key = (file.path ?? '').replace(/^\/+/, '');
    if (!key) return;

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete S3 object for file ${fileId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        'Could not remove image from storage. Please try again.',
      );
    }
  }

  private isRejectedConfidenceValue(
    confidence: number | string | null | undefined,
  ): boolean {
    if (confidence === null || confidence === undefined) return false;
    const parsed = Number(confidence);
    return Number.isFinite(parsed) && parsed <= 0;
  }
}
