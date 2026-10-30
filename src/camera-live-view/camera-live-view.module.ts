import { Module } from '@nestjs/common';
import { CameraLiveViewController } from './camera-live-view.controller';
import { CameraLiveViewService } from './camera-live-view.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraLiveViewEntity } from './infrastructure/persistence/relational/entities/camera-live-view.entity';
import { FilesS3PresignedModule } from 'src/files/infrastructure/uploader/s3-presigned/files.module';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';
import { MailModule } from 'src/mail/mail.module';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CameraLiveViewEntity,
      CameraEntity,
      HaulerEntity,
      WasteStreamCamerasEntity,
      JobSitesWasteStreamsEntity,
    ]),
    FilesS3PresignedModule,
    MailModule,
  ],
  controllers: [CameraLiveViewController],
  providers: [CameraLiveViewService],
  exports: [CameraLiveViewService],
})
export class CameraLiveViewModule {}
