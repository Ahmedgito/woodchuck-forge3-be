import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { AlertToType } from '../alertToType.enum';
import { JobSite } from 'src/job-sites/domain/job-site';
import { Camera } from 'src/cameras/domain/camera';

export class UpdateJobSiteCamerasDto {
  @ApiProperty()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsOptional()
  maxLevel: number;

  @ApiProperty()
  @IsOptional()
  alertTo: number;

  @ApiProperty({ enum: AlertToType })
  @IsOptional()
  alertToType: number;

  @ApiProperty()
  @IsOptional()
  jobSiteId?: JobSite['id'];

  @ApiProperty()
  @IsOptional()
  cameraId?: Camera['id'];
}
