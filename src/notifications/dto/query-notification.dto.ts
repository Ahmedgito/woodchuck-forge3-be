import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { Notification } from '../domain/notification';
import { SmsDumpsterStatusesEnum } from 'src/sms-dumpster/sms-dumpster-statuses.enum';

export class FilterNotificationDto {
  @ApiProperty({})
  @IsDateString()
  @IsOptional()
  lastcreated: Date;

  @ApiProperty({})
  @IsNumber()
  @IsOptional()
  jobSiteId: number;

  @ApiProperty({ enum: SmsDumpsterStatusesEnum })
  @IsOptional()
  @IsEnum(SmsDumpsterStatusesEnum)
  status: SmsDumpsterStatusesEnum;
}

export class SortNotificationDto {
  @ApiProperty()
  @IsString()
  orderBy: keyof Notification;

  @ApiProperty()
  @IsString()
  order: string;
}

export class QueryNotificationDto {
  @ApiProperty({
    required: false,
  })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page: number;

  @ApiProperty({
    required: false,
  })
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit: number;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(FilterNotificationDto, JSON.parse(value))
      : undefined,
  )
  @ValidateNested()
  @Type(() => FilterNotificationDto)
  filters?: FilterNotificationDto | null;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    return value
      ? plainToInstance(SortNotificationDto, JSON.parse(value))
      : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortNotificationDto)
  sort?: SortNotificationDto[] | null;
}
