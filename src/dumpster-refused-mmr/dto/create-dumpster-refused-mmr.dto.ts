import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateDumpsterRefusedMmrDto {
  @ApiProperty()
  @IsNumber()
  jobSiteId?: number;

  @ApiProperty()
  @IsNumber()
  dumpsterLocationId?: number;

  @ApiProperty()
  @IsNumber()
  dumspterSize?: number;

  @ApiProperty()
  @IsNumber()
  dumspterCount?: number | 0;
}
