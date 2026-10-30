import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateCameraDto {
  @ApiProperty()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsOptional()
  cameraId: string;

  @ApiProperty()
  @IsOptional()
  ipAddress: string;

  @ApiProperty()
  @IsOptional()
  url: string;
}
