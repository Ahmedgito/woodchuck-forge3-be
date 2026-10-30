import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class MaterialDestinationDto {
  @ApiProperty({ example: 'powerplant', description: 'Type: powerplant or location' })
  @IsString()
  type: string;

  @ApiProperty({ example: 1, description: 'ID of the powerplant or location' })
  @IsNumber()
  id: number;
}

export class MapDataStatsDto {
  @ApiProperty({ example: '2024-05-01', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2026-02-28', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  jobSiteId?: number;

  @ApiProperty({ required: false, description: 'Filter by waste type name' })
  @IsString()
  @IsOptional()
  wasteType?: string;

  @ApiProperty({
    required: false,
    description:
      'Filter by material destinations. Empty or omitted = all destinations.',
    type: [MaterialDestinationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDestinationDto)
  @IsOptional()
  materialDestinations?: MaterialDestinationDto[];


}
