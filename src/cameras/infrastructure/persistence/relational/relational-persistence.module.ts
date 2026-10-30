import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraEntity } from './entities/camera.entity';
import { JobSitesCamerasEntity } from 'src/job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { CameraLiveViewEntity } from 'src/camera-live-view/infrastructure/persistence/relational/entities/camera-live-view.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CameraEntity,
      JobSitesCamerasEntity,
      CameraLiveViewEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalCameraPersistenceModule {}
