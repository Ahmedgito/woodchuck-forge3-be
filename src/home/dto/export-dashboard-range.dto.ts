import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsArray,
  IsEnum,
  IsOptional,
  ArrayUnique,
  IsString,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { MaterialDestinationDto } from 'src/job-sites-waste-streams/dto/map-data-stats.dto';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';

export class ExportDashboardRangeDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    enum: ReportFormatEnum,
    isArray: true,
    required: false,
    default: [ReportFormatEnum.PDF],
  })
  @IsArray()
  @IsEnum(ReportFormatEnum, { each: true })
  @ArrayUnique()
  @IsOptional()
  formats?: ReportFormatEnum[];

  @ApiProperty({
    description: 'Filter by waste type name (e.g., "WOOD WASTE", "METAL")',
    required: false,
  })
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
