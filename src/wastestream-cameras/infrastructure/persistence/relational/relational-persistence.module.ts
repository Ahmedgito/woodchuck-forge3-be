import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { DumpsterLiveViewEntity } from 'src/dumpster-live-view/infrastructure/persistence/relational/entities/dumpster-live-view.entity';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';
import { WasteStreamCamerasEntity } from './entities/wastestream-cameras.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WasteStreamCamerasEntity,
      JobSiteEntity,
      JobSitesWasteStreamsEntity,
      CameraEntity,
      DumpsterLiveViewEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamCamerasPersistenceModule {}
