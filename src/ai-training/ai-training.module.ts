import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiTrainingController } from './ai-training.controller';
import { AiTrainingService } from './ai-training.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiTrainingController],
  providers: [AiTrainingService],
})
export class AiTrainingModule {}
