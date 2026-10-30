import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WeightTicketTrainingController } from './weight-ticket-training.controller';
import { WeightTicketTrainingService } from './weight-ticket-training.service';

@Module({
  imports: [ConfigModule],
  controllers: [WeightTicketTrainingController],
  providers: [WeightTicketTrainingService],
})
export class WeightTicketTrainingModule {}
