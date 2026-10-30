import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsOptional } from 'class-validator';
import { AlertToType } from '../alertToType.enum';

export class CreateWasteStreamCameraDto {
  @ApiProperty()
  @IsNumber()
  cameraId: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  additionalCameraId: number;

  @ApiProperty()
  @IsNumber()
  maxLevel: number;

  @ApiProperty()
  @IsEnum(AlertToType)
  alertToType: AlertToType;

  @ApiProperty()
  @IsNumber()
  alertTo: number;

  @ApiProperty()
  @IsNumber()
  confidenceLevel?: number;
}
