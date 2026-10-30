import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { JobSite } from '../domain/job-site';

export class FilterJobSiteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  clientId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  endClientId?: number;
}

export class SortJobSiteDto {
  @ApiProperty()
  @IsString()
  orderBy: keyof JobSite;

  @ApiProperty()
  @IsString()
  order: string;
}

export class QueryJobSiteDto {
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
    value ? plainToInstance(FilterJobSiteDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterJobSiteDto)
  filters?: FilterJobSiteDto | null;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    return value
      ? plainToInstance(SortJobSiteDto, JSON.parse(value))
      : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortJobSiteDto)
  sort?: SortJobSiteDto[] | null;
}
