import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReportTypeEnum } from '../report-types.enum';
import { ReportFrequencyEnum } from '../report-frequency.enum';

export class CreateSubscriptionDto {
  @ApiProperty({ enum: ReportTypeEnum })
  @IsEnum(ReportTypeEnum)
  reportType: ReportTypeEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  jobSiteId?: number;

  @ApiProperty({
    enum: ReportFrequencyEnum,
    default: ReportFrequencyEnum.MONTHLY,
    required: false,
    description: 'Report frequency - monthly or weekly. Defaults to monthly.',
  })
  @IsOptional()
  @IsEnum(ReportFrequencyEnum)
  frequency?: ReportFrequencyEnum;
}
