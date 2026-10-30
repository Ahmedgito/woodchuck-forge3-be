import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsEntity } from './entities/sms.entity';
import { RelationalJobSitePersistenceModule } from 'src/job-sites/infrastructure/persistence/relational/relational-persistence.module';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmsEntity, HaulerEntity]),
    RelationalJobSitePersistenceModule,
  ],
  exports: [TypeOrmModule],
})
export class RelationalSmsPersistenceModule {}
