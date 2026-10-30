import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class WasteStreamOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  order: number;
}

export class UpdateJobSiteWasteStreamOrderDto {
  @ApiProperty({ type: [WasteStreamOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WasteStreamOrderItemDto)
  wasteStreams: WasteStreamOrderItemDto[];
}
