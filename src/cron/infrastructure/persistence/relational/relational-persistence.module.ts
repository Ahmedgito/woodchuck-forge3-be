import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WasteStreamCamerasEntity,
      JobSiteEntity,
      CameraEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalCronPersistenceModule {}
