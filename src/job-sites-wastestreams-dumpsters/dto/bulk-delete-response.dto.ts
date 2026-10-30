import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteItemResult {
  @ApiProperty()
  id: number;

  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  error?: string;
}

export class BulkDeleteJobSitesWastestreamsDumpstersResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  successful: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [BulkDeleteItemResult] })
  results: BulkDeleteItemResult[];
}
