import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateCameraDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  cameraId: string;

  @ApiProperty()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  url: string;
}
