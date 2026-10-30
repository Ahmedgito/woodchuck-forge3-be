import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ImageMetadataSource } from '../enums/image-metadata-source.enum';

export class CreateWasteStreamImageDto {
  @ApiProperty({ description: 'ID of the jobsites_wastestreams record' })
  @IsInt()
  jobsiteWasteStreamId: number;

  @ApiProperty({ description: 'UUID of the uploaded file record' })
  @IsUUID()
  fileId: string;

  @ApiProperty({ description: 'Display order (1–4)', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  displayOrder: number;

  @ApiPropertyOptional({
    description: 'Photo capture timestamp from EXIF or device (ISO 8601)',
    example: '2026-06-16T14:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @ApiPropertyOptional({
    description: 'Capture latitude from EXIF or device GPS',
    minimum: -90,
    maximum: 90,
  })
  @ValidateIf((dto) => dto.longitude !== undefined && dto.longitude !== null)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Capture longitude from EXIF or device GPS',
    minimum: -180,
    maximum: 180,
  })
  @ValidateIf((dto) => dto.latitude !== undefined && dto.latitude !== null)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Where capture metadata came from',
    enum: ImageMetadataSource,
  })
  @IsOptional()
  @IsEnum(ImageMetadataSource)
  metadataSource?: ImageMetadataSource;
}
