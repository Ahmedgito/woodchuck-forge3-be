import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { AlertToType } from '../alertToType.enum';
import { JobSite } from 'src/job-sites/domain/job-site';
import { Camera } from 'src/cameras/domain/camera';

export class CreateJobSitesCamerasDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  maxLevel: number;

  @ApiProperty()
  @IsNotEmpty()
  alertTo: number;

  @ApiProperty({ enum: AlertToType })
  @IsNotEmpty()
  alertToType: number;

  @ApiProperty()
  @IsNotEmpty()
  jobSiteId?: JobSite['id'];

  @ApiProperty()
  @IsNotEmpty()
  cameraId?: Camera['id'];
}
