import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientReportConfigEntity } from './entities/client-report-config.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClientReportConfigEntity, UserEntity])],
  exports: [TypeOrmModule],
})
export class RelationalClientReportConfigPersistenceModule {}
