import { Module } from '@nestjs/common';
import { JobSiteRepository } from '../job-site.repository';
import { JobSitesRelationalRepository } from './repositories/job-site.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSiteEntity } from './entities/job-site.entity';
import { DumpsterEntity } from 'src/dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { JobSiteDetailsEntity } from 'src/job-sites-details/infrastructure/persistence/entities/job-site-details.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { JobsiteSubLocationEntity } from 'src/job-sites-sub-locations/infrastructure/persistence/relational/entities/job-sites-sub-locations.entity';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobSiteEntity,
      DumpsterEntity,
      JobSiteDetailsEntity,
      UserEntity,
      JobsiteSubLocationEntity,
      AddressEntity,
    ]),
  ],
  providers: [
    {
      provide: JobSiteRepository,
      useClass: JobSitesRelationalRepository,
    },
  ],
  exports: [JobSiteRepository, TypeOrmModule],
})
export class RelationalJobSitePersistenceModule {}
