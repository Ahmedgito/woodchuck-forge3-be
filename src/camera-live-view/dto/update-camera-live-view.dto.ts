import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateCameraLiveViewDto {
  @ApiProperty()
  @IsOptional()
  cameraIds: string[];

  @ApiProperty()
  @IsOptional()
  cameraArr: {
    camera_id: string;
    s3_url: string;
  }[];
}
