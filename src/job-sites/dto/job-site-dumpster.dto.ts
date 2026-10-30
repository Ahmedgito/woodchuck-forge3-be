import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Dumpster } from 'src/dumpster/domain/dumpster';

export class JobSiteDumpsterDto implements Dumpster {
  @ApiProperty()
  @IsNumber()
  id?: number;
}
