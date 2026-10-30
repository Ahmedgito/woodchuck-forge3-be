import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSitesWasteStreamsEntity } from './entities/job-sites-waste-streams.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { JobSitesCamerasEntity } from 'src/job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import { JobsiteWasteStreamLocationsEntity } from 'src/job-site-waste-stream-locations/infrastructure/persistence/relational/entities/job-site-waste-stream-locations.entity';
import { WasteStreamsEntity } from 'src/wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { VesselEntity } from 'src/vessels/infrastructure/persistence/relational/entities/vessel.entity';
import { PowerPlantsEntity } from 'src/power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { WasteStreamImageEntity } from 'src/waste-stream-images/infrastructure/persistence/relational/entities/waste-stream-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobSitesWasteStreamsEntity,
      JobSiteEntity,
      JobSiteWastestreamsDumpstersEntity,
      JobSitesCamerasEntity,
      WasteStreamCamerasEntity,
      JobsiteWasteStreamLocationsEntity,
      WasteStreamsEntity,
      WasteStreamTypesEntity,
      VesselEntity,
      PowerPlantsEntity,
      WasteStreamImageEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalJobSitesWasteStreamsPersistenceModule {}
