import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportSubscriptionsEntity } from './entities/report-subscriptions.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReportSubscriptionsEntity, UserEntity])],
  exports: [TypeOrmModule],
})
export class RelationalWasteStreamsPersistenceModule {}
