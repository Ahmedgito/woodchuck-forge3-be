import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';

export class CreateJobsiteWasteStreamLocationDto {
  @ApiProperty()
  @IsNumber()
  type: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  locationId?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  powerplantId?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  haulerId?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  distance?: number;
}
