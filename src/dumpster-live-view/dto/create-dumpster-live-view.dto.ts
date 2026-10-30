import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateDumpsterLiveViewDto {
  @ApiProperty()
  @IsNumber()
  jobSiteId?: number;

  @ApiProperty()
  @IsNotEmpty()
  s3ImageUrl?: string | null;

  @ApiProperty()
  @IsNumber()
  fillPercentage?: number | null;

  @ApiProperty()
  @IsNumber()
  gateId?: number | null;
}
