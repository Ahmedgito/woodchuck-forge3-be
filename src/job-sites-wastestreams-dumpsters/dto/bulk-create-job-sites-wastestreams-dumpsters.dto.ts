import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BulkCreateItemDto } from './bulk-create-item.dto';

export class BulkCreateJobSitesWastestreamsDumpstersDto {
  @ApiProperty({
    type: [BulkCreateItemDto],
    description:
      'Array of dumpster creation requests (each item represents a single dumpster). Maximum 20 items allowed per request.',
    maxItems: 20,
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMaxSize(20, {
    message: 'Maximum 20 dumpsters allowed per bulk create request',
  })
  @ValidateNested({ each: true })
  @Type(() => BulkCreateItemDto)
  dumpsters: BulkCreateItemDto[];
}
