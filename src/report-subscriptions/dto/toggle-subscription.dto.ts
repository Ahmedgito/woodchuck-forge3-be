import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayUnique,
  IsEmail,
} from 'class-validator';
import { ReportTypeEnum } from '../report-types.enum';
import { ReportFrequencyEnum } from '../report-frequency.enum';
import { ReportFormatEnum } from '../report-format.enum';
import { CompressionExtensionEnum } from '../compression-extension.enum';

export class ToggleSubscriptionDto {
  @ApiProperty({ enum: ReportTypeEnum })
  @IsEnum(ReportTypeEnum)
  reportType: ReportTypeEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  jobSiteId?: number;

  @ApiProperty({
    enum: ReportFrequencyEnum,
    description: 'Report frequency - monthly or weekly',
  })
  @IsEnum(ReportFrequencyEnum)
  frequency: ReportFrequencyEnum;

  @ApiProperty({
    type: Boolean,
    description: 'true to activate, false to deactivate',
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    enum: ReportFormatEnum,
    isArray: true,
    required: false,
    description: 'Array of report formats (PDF, Excel, CSV)',
    default: [ReportFormatEnum.PDF],
  })
  @IsArray()
  @IsEnum(ReportFormatEnum, { each: true })
  @ArrayUnique()
  @IsOptional()
  formats?: ReportFormatEnum[];

  @ApiProperty({
    enum: CompressionExtensionEnum,
    required: false,
    description:
      'Archive format for scheduled report emails. All reports are delivered as secure download links (never attachments). "zip" delivers a single .zip download link per report; "piz" delivers both a .zip and a .piz download link so recipients can use whichever their mail client/proxy allows.',
    default: CompressionExtensionEnum.ZIP,
  })
  @IsEnum(CompressionExtensionEnum)
  @IsOptional()
  compressionExtension?: CompressionExtensionEnum;

  @ApiProperty({
    type: String,
    isArray: true,
    required: false,
    description:
      "Addresses to CC on this subscription's report emails. CC recipients are visible to the subscriber. Send an empty array to clear the list.",
    default: [],
    example: ['dre@woodchuck.ai'],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayUnique()
  @IsOptional()
  reportCcEmails?: string[];
}
