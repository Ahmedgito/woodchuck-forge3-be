import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WasteStreamImageEntity } from './infrastructure/persistence/relational/entities/waste-stream-image.entity';
import { WasteStreamImagesService } from './waste-stream-images.service';
import { WasteStreamImagesController } from './waste-stream-images.controller';
import {
  WasteStreamImagesQueueService,
  AI_IMAGE_ANALYSIS_QUEUE,
} from './waste-stream-images-queue.service';
import { AiImageAnalysisConsumer } from './consumers/ai-image-analysis.consumer';
import { AiVisionModule } from 'src/ai-vision/ai-vision.module';
import { GenieModule } from 'src/genie/genie.module';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { FileEntity } from 'src/files/infrastructure/persistence/relational/entities/file.entity';
import { RelationalWasteStreamImagesPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    RelationalWasteStreamImagesPersistenceModule,
    TypeOrmModule.forFeature([
      WasteStreamImageEntity,
      JobSitesWasteStreamsEntity,
      JobSiteEntity,
      FileEntity,
    ]),
    BullModule.registerQueue({ name: AI_IMAGE_ANALYSIS_QUEUE }),
    AiVisionModule,
    GenieModule,
  ],
  controllers: [WasteStreamImagesController],
  providers: [
    WasteStreamImagesService,
    WasteStreamImagesQueueService,
    AiImageAnalysisConsumer,
  ],
  exports: [WasteStreamImagesService, WasteStreamImagesQueueService],
})
export class WasteStreamImagesModule {}
