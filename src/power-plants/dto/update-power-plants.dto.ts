import { PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreatePowerPlantsDto } from './create-power-plants.dto';

export class UpdatePowerPlantsDto extends PartialType(CreatePowerPlantsDto) {
  @IsOptional()
  name?: string;

  /*
  @IsOptional()
  type?: string;
  */

  @IsOptional()
  kwhPerTon?: number;
}
