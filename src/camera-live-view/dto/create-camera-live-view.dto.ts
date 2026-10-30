import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCameraLiveViewDto {
  @ApiProperty()
  @IsNotEmpty()
  s3ImageUrl?: string | null;

  @ApiProperty()
  @IsNumber()
  fillPercentage?: number | null;

  @ApiProperty()
  @IsNumber()
  cameraId?: string | null;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  captureCount?: number | null;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  isOnline?: boolean | null;

  @ApiProperty()
  @IsOptional()
  captureDatetime?: string | null;
}
