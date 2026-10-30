import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { JobSiteWasteStreams } from 'src/job-sites-waste-streams/domain/job-sites-waste-streams';

export class CreateJobSitesWastestreamsDumpstersDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  no_of_dumpster: number;

  @ApiProperty()
  @IsNotEmpty()
  jobSiteWastestreamsId: JobSiteWasteStreams['id'];

  @ApiProperty()
  @IsNotEmpty()
  //@IsDate()
  creationDate: Date;

  @ApiProperty()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  real_weight?: number;
}
