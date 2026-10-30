import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiVisionService } from './ai-vision.service';

@Module({
  imports: [ConfigModule],
  providers: [AiVisionService],
  exports: [AiVisionService],
})
export class AiVisionModule {}
