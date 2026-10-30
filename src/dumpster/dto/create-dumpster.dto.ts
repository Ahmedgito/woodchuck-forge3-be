import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Dumpster } from '../domain/dumpster';
import { Type } from 'class-transformer';
import { JobSiteDumpsterDto } from 'src/job-sites/dto/job-site-dumpster.dto';

export class CreateDumpsterDto implements Dumpster {
  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  sublocationName: string;

  @ApiProperty()
  @IsOptional()
  distanceToMmr: string;

  unit?: string;

  @Type(() => JobSiteDumpsterDto)
  jobSite: JobSiteDumpsterDto;
}
