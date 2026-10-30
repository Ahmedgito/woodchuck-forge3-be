import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ExportUserFilterDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate: string;
}
