import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSitesCamerasEntity } from './entities/job-sites-cameras.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { DumpsterLiveViewEntity } from 'src/dumpster-live-view/infrastructure/persistence/relational/entities/dumpster-live-view.entity';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobSitesCamerasEntity,
      JobSiteEntity,
      JobSitesWasteStreamsEntity,
      CameraEntity,
      DumpsterLiveViewEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalJobSitesWasteStreamsPersistenceModule {}
