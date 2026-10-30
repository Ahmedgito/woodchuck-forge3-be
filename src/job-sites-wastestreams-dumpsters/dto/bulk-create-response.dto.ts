import { ApiProperty } from '@nestjs/swagger';

export class BulkCreateItemResult {
  @ApiProperty()
  index: number;

  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  jobSiteWastestreamsId?: number;
}

export class BulkCreateJobSitesWastestreamsDumpstersResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  successful: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [BulkCreateItemResult] })
  results: BulkCreateItemResult[];
}

