import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileConfig, FileDriver } from 'src/files/config/file-config.type';
import fileConfig from 'src/files/config/file.config';

export interface AiVisionResult {
  /** Confidence level 0–100 */
  confidenceLevel: number;
  /** Whether the image content matches/verifies the waste stream */
  verified: boolean;
  /** Raw response from the AI provider for audit storage */
  rawResponse: Record<string, any>;
}

@Injectable()
export class AiVisionService {
  private readonly logger = new Logger(AiVisionService.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly driver: FileDriver;
  /** WoodChuck ML predict endpoint (env: AI_MODEL_URL) */
  private readonly aiModelUrl: string;

  constructor(configService: ConfigService) {
    this.aiModelUrl =
      configService.get<string>('AI_MODEL_URL', { infer: true }) ??
      'https://woodchuck-ml-dev.folio3.site/predict_wood_type';
    const fileCfg = fileConfig() as FileConfig;
    this.driver = fileCfg.driver;
    this.region = fileCfg.awsS3Region ?? '';
    this.bucket = fileCfg.awsDefaultS3Bucket ?? '';
  }

  async analyzeImage(
    filePath: string,
    expectedWoodType?: string,
  ): Promise<AiVisionResult> {
    if (this.driver === FileDriver.LOCAL) {
      throw new Error(
        'AI image analysis requires S3 file storage. ' +
          'Set FILE_DRIVER=s3 (or s3-presigned) and configure AWS_DEFAULT_S3_BUCKET / AWS_S3_REGION.',
      );
    }
    if (!this.bucket) {
      throw new Error(
        'AWS_DEFAULT_S3_BUCKET is not configured. AI image analysis cannot build a valid S3 URL.',
      );
    }
    this.logger.log(`Analyzing image via WoodChuck ML, file: ${filePath}`);
    return this.analyzeWithWoodchuckML(filePath, expectedWoodType);
  }

  /**
   * Calls the WoodChuck ML API.
   * Input:  POST { s3_url: "https://bucket.s3.region.amazonaws.com/key" }
   * Output: { success: true, wood_type: string, confidence: number (0–1) }
   */
  private async analyzeWithWoodchuckML(
    filePath: string,
    expectedWoodType?: string,
  ): Promise<AiVisionResult> {
    const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath.replace(/^\/+/, '')}`;

    this.logger.log(
      `Calling WoodChuck ML API: ${this.aiModelUrl} for ${s3Url}`,
    );

    const response = await fetch(this.aiModelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3_url: s3Url }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(
        `WoodChuck ML API returned ${response.status}: ${await response.text()}`,
      );
    }

    const body = (await response.json()) as {
      success: boolean;
      wood_type: string;
      confidence: number;
    };

    if (!body.success) {
      throw new Error(
        `WoodChuck ML API reported failure: ${JSON.stringify(body)}`,
      );
    }

    this.logger.log(
      `WoodChuck ML response — wood_type: "${body.wood_type}", confidence: ${body.confidence}`,
    );

    // If an expected wood type is provided, verify the ML prediction matches.
    // Mismatch means the image doesn't belong to this waste stream → confidence 0.
    const woodTypeMatched =
      !expectedWoodType ||
      body.wood_type?.trim().toLowerCase() ===
        expectedWoodType.trim().toLowerCase();

    if (expectedWoodType) {
      if (woodTypeMatched) {
        this.logger.log(
          `Wood type matched — expected: "${expectedWoodType}", ML returned: "${body.wood_type}"`,
        );
      } else {
        this.logger.warn(
          `Wood type mismatch — expected: "${expectedWoodType}", ML returned: "${body.wood_type}". Setting confidence to 0.`,
        );
      }
    }

    // API returns confidence as 0–1 float; backend stores 0–100
    const rawConfidenceLevel =
      body.confidence <= 1.0
        ? Math.round(body.confidence * 100)
        : Math.round(body.confidence);

    const confidenceLevel = woodTypeMatched ? rawConfidenceLevel : 0;

    return {
      confidenceLevel,
      verified: body.success,
      rawResponse: {
        provider: 'woodchuck-ml',
        s3_url: s3Url,
        wood_type: body.wood_type,
        confidence: body.confidence,
        wood_type_matched: woodTypeMatched,
      },
    };
  }
}
