import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional } from 'class-validator';

export class FilterBarGraphDto {
  @ApiProperty({ example: new Date() })
  @IsDateString()
  @IsOptional()
  startDate: string;

  @ApiProperty({ example: new Date() })
  //@ValidateIf((obj) => !!obj.startDate)
  @IsNotEmpty({ message: 'To field is required if From field is provided.' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  jobSiteId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  clientId: string;
}

export class FilterBarGraphGroupDto {
  @ApiProperty({ example: new Date() })
  @IsDateString()
  @IsOptional()
  startDate: string;

  @ApiProperty({ example: new Date() })
  //@ValidateIf((obj) => !!obj.startDate)
  @IsNotEmpty({ message: 'To field is required if From field is provided.' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (typeof value === 'number' ? value : JSON.parse(value)) : undefined,
  )
  jobSiteId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  clientId: string;
}
