import {
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertCarbonCreditDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  jobSiteId: number;

  @ApiProperty({
    example: 2500.0,
    description: 'Carbon credit dollar value',
  })
  @IsNumber()
  @Min(0)
  carbonCreditDollars: number;
}

export class UpsertCarbonCreditBulkDto {
  @ApiProperty({ type: [UpsertCarbonCreditDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCarbonCreditDto)
  items: UpsertCarbonCreditDto[];
}
