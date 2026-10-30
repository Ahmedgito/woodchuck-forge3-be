import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasteStreamsEntity } from './entities/wastestreams.entity';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { WasteStreamTypeVesselsEntity } from 'src/wastestream-type-vessels/infrastructure/persistence/relational/entities/wastestream-type-vessels.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WasteStreamsEntity,
      WasteStreamTypesEntity,
      WasteStreamTypeVesselsEntity,
      JobSitesWasteStreamsEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamsPersistenceModule {}
