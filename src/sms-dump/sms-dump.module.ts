import { Module } from '@nestjs/common';
import { SmsDumpController } from './sms-dump.controller';
import { SmsDumpService } from './sms-dump.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsDumpEntity } from './infrastructure/persistence/relational/entities/sms-dump.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsDumpEntity])],
  controllers: [SmsDumpController],
  providers: [SmsDumpService],
})
export class SmsDumpModule {}
