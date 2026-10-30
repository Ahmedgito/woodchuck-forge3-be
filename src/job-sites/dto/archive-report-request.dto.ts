import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayNotEmpty,
  Matches,
  IsNumber,
  IsEnum,
  IsOptional,
  ArrayUnique,
} from 'class-validator';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';

export class ArchiveRequestDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  @Matches(/^\d{1,2}-\d{4}$/, { each: true })
  months: string[];

  @ApiProperty()
  @IsNumber()
  jobSiteId: number;

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
}

export class ArchiveReportPlanDto {
  month: string;
  startDate: string;
  endDate: string;
  monthName: string;
}
