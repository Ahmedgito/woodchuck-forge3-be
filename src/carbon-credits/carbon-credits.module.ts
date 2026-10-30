import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarbonCreditEntity } from './infrastructure/persistence/relational/entities/carbon-credit.entity';
import { CarbonCreditsController } from './carbon-credits.controller';
import { CarbonCreditsService } from './carbon-credits.service';
import { ApiKeyModule } from 'src/api-key/api-key.module';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key.guard';
import { RateLimitGuard } from 'src/auth/guards/rate-limit.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CarbonCreditEntity]), ApiKeyModule],
  controllers: [CarbonCreditsController],
  providers: [CarbonCreditsService, ApiKeyAuthGuard, RateLimitGuard],
  exports: [CarbonCreditsService],
})
export class CarbonCreditsModule {}
