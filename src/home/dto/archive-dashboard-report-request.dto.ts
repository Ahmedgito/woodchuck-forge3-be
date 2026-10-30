import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsEnum,
  IsOptional,
  ArrayUnique,
  ValidateNested,
} from 'class-validator';
import { MaterialDestinationDto } from 'src/job-sites-waste-streams/dto/map-data-stats.dto';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';

export class ArchiveDashboardReportRequestDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  months: string[];

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
    description: 'Material destination type ("powerplant" or "location")',
    required: false,
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
}
