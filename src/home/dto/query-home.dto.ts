import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateIf,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';

export class FilterHomeDto {
  @ApiProperty()
  @IsDateString()
  @IsOptional()
  rangeFrom: Date;

  @ApiProperty()
  @ValidateIf((obj) => !!obj.from)
  @IsNotEmpty({ message: 'To field is required if From field is provided.' })
  @IsDateString()
  rangeTo: Date;

  @ApiProperty({})
  @IsNumber()
  @IsOptional()
  //@ValidateNested({ each: true })
  //@Type()
  jobSiteId: number;

  @IsOptional()
  clientId?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  search: string;
}

export class QueryHomeDto {
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
    value ? plainToInstance(FilterHomeDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterHomeDto)
  filters?: FilterHomeDto | null;
}
