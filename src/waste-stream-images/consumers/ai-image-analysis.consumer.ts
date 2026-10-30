import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WasteStreamImageEntity } from '../infrastructure/persistence/relational/entities/waste-stream-image.entity';
import { AiVisionService } from 'src/ai-vision/ai-vision.service';
import { WasteStreamImagesService } from '../waste-stream-images.service';
import { AiStatus } from '../enums/ai-status.enum';
import { AI_IMAGE_ANALYSIS_QUEUE } from '../waste-stream-images-queue.service';
import { GenieService } from 'src/genie/genie.service';

const DEFAULT_CONFIDENCE_THRESHOLD = 75;

@Processor(AI_IMAGE_ANALYSIS_QUEUE)
export class AiImageAnalysisConsumer {
  private readonly logger = new Logger(AiImageAnalysisConsumer.name);

  constructor(
    @InjectRepository(WasteStreamImageEntity)
    private readonly imageRepo: Repository<WasteStreamImageEntity>,
    private readonly aiVisionService: AiVisionService,
    private readonly wasteStreamImagesService: WasteStreamImagesService,
    private readonly genieService: GenieService,
  ) {}

  @Process('analyze-image-job')
  async handleAnalyze(job: Job<{ imageId: string }>): Promise<void> {
    const { imageId } = job.data;
    this.logger.log(`Processing AI analysis for image: ${imageId}`);

    const image = await this.imageRepo.findOne({
      where: { id: imageId },
      relations: [
        'file',
        'jobsiteWasteStream',
        'jobsiteWasteStream.wasteStreamType',
      ],
    });

    if (!image) {
      this.logger.warn(`Image ${imageId} not found — skipping`);
      return;
    }

    if (!image.isLatest) {
      this.logger.log(`Image ${imageId} is no longer latest — skipping AI`);
      return;
    }

    // Mark as processing
    await this.wasteStreamImagesService.setAiProcessing(imageId);

    try {
      // Resolve waste stream type name (e.g. "T2 Construction WW") for AI verification
      const wasteStreamName =
        image.jobsiteWasteStream?.wasteStreamType?.name ?? undefined;

      // Get configurable confidence threshold from Genie feature flags
      let confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD;
      try {
        const genie = await this.genieService.findByValue(
          'ai_image_confidence_threshold',
        );
        if (genie?.description) {
          const parsed = parseFloat(genie.description);
          if (!isNaN(parsed)) confidenceThreshold = parsed;
        }
      } catch {
        // use default
      }

      const result = await this.aiVisionService.analyzeImage(
        image.file.path,
        wasteStreamName,
      );

      const confidenceLevel = Number(result.confidenceLevel);
      if (!Number.isFinite(confidenceLevel)) {
        throw new Error(
          `AI analysis returned invalid confidence value: ${result.confidenceLevel}`,
        );
      }

      if (confidenceLevel <= 0) {
        this.logger.warn(
          `Image ${imageId} rejected with confidence 0. Removing image and file from storage.`,
        );
        await this.wasteStreamImagesService.deleteById(imageId);
        return;
      }

      await this.wasteStreamImagesService.setAiResult(imageId, {
        aiStatus: AiStatus.COMPLETE,
        aiConfidenceLevel: confidenceLevel,
        aiVerified:
          confidenceLevel > 0 &&
          (result.verified || confidenceLevel >= confidenceThreshold),
        aiResponseRaw: result.rawResponse,
      });

      this.logger.log(
        `AI analysis complete for ${imageId}: confidence=${result.confidenceLevel}, verified=${result.verified}`,
      );
    } catch (error) {
      this.logger.error(
        `AI analysis failed for image ${imageId}: ${error.message}`,
        error.stack,
      );
      await this.wasteStreamImagesService.setAiResult(imageId, {
        aiStatus: AiStatus.FAILED,
        aiConfidenceLevel: null,
        aiVerified: null,
        aiResponseRaw: { error: error.message },
      });
      // Do not retry configuration errors (e.g. local file driver, missing S3 bucket).
      // These will never succeed without an environment change.
      const isConfigError =
        error.message?.includes('AI image analysis requires S3') ||
        error.message?.includes('AWS_DEFAULT_S3_BUCKET is not configured');
      if (!isConfigError) {
        throw error; // Re-throw so Bull retries transient errors
      }
    }
  }
}
