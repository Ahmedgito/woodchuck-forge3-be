import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { JobSiteWasteStreams } from 'src/job-sites-waste-streams/domain/job-sites-waste-streams';

export class BulkCreateItemDto {
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

