import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsDumpsterEntity } from './entities/sms-dumpster.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsDumpsterEntity])],
  exports: [TypeOrmModule],
})
export class RelationalSmsDumpsterPersistenceModule {}
