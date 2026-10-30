import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VesselEntity } from './entities/vessel.entity';
import { VesselOptionsEntity } from 'src/vessel-options/infrastructure/persistence/relational/entities/vessel-options.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VesselEntity,
      VesselOptionsEntity,
      JobSitesWasteStreamsEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamsPersistenceModule {}
