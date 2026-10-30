import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImpersonationLogEntity } from './infrastructure/persistence/relational/entities/impersonation-log.entity';
import { ImpersonationService } from './impersonation.service';

@Module({
  imports: [TypeOrmModule.forFeature([ImpersonationLogEntity])],
  providers: [ImpersonationService],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
