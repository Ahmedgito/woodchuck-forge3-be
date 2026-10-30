import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform,Type } from 'class-transformer';
import { MaterialDestinationDto } from './map-data-stats.dto';

export class FilterMapDataDto {
  @ApiProperty({ example: new Date(), required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: new Date(), required: false })
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
    description: 'Filter by material destination type (e.g., processing, end)',
  })
  @IsString()
  @IsOptional()
  materialDestinationType?: string;

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

  @ApiProperty({
    required: false,
    description: 'Include verification images around jobsite markers',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeVerificationImages?: boolean;


  @ApiProperty({
    required: false,
    description: 'Filter by material destination location ID',
  })
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  materialDestination?: number;
}

