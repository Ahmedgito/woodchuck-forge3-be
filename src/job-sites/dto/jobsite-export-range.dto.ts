import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsArray,
  IsEnum,
  ArrayUnique,
  IsNumber,
} from 'class-validator';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';

export class JobSiteExportRangeDto {
  @ApiProperty()
  @IsNumber()
  jobSiteId: number;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: ReportFormatEnum, isArray: true, required: false })
  @IsArray()
  @IsEnum(ReportFormatEnum, { each: true })
  @ArrayUnique()
  formats?: ReportFormatEnum[];
}
