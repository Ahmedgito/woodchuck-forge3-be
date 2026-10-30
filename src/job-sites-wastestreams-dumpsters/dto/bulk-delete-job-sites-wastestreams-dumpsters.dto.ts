import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkDeleteJobSitesWastestreamsDumpstersDto {
  @ApiProperty({
    type: Number,
    description: 'The job site waste stream ID that the dumpsters belong to.',
    example: 1,
  })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  jobSiteWastestreamsId: number;

  @ApiProperty({
    type: [Number],
    description:
      'Array of dumpster IDs to delete. All IDs must belong to the specified waste stream.',
    example: [1, 2, 3],
    minItems: 1,
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, {
    message: 'At least one ID is required for bulk delete',
  })
  @IsNumber({}, { each: true })
  @Type(() => Number)
  ids: number[];
}
