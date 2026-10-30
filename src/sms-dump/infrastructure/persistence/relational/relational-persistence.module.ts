import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsDumpEntity } from './entities/sms-dump.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsDumpEntity])],
})
export class RelationalSmsDumpPersistenceModule {}
