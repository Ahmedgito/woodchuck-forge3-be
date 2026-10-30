import { PartialType } from '@nestjs/swagger';
import { CreateJobSiteDetailsDto } from './create-job-site-details.dto';

export class UpdateJobSiteDetailsDto extends PartialType(
  CreateJobSiteDetailsDto,
) {}
