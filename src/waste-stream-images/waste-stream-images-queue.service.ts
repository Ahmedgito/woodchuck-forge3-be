import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export const AI_IMAGE_ANALYSIS_QUEUE = 'ai-image-analysis';

@Injectable()
export class WasteStreamImagesQueueService {
  constructor(
    @InjectQueue(AI_IMAGE_ANALYSIS_QUEUE)
    private readonly aiAnalysisQueue: Queue,
  ) {}

  async enqueueAiAnalysis(imageId: string): Promise<void> {
    await this.aiAnalysisQueue.add(
      'analyze-image-job',
      { imageId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }
}
