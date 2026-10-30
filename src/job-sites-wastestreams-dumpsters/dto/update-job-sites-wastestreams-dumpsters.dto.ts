import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateJobSitesWastestreamsDumpstersDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  real_weight: number;
}
