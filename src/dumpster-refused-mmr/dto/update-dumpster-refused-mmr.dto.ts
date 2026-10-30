// import { PartialType } from '@nestjs/swagger';
// import { CreateDumpsterRefusedMmrDto } from './create-dumpster-refused-mmr.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateDumpsterRefusedMmrDto {
  @ApiProperty()
  @IsNumber()
  dumspterCount?: number;
}
