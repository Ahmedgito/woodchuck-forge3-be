import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { JobSite } from 'src/job-sites/domain/job-site';

export class CreateSmsDto {
  @ApiProperty()
  @IsNotEmpty()
  jobSiteId: JobSite['id'];
}
