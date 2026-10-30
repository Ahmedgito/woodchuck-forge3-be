import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWasteStreamsDto } from './create-wastestreams.dto';
import { PartialType } from '@nestjs/swagger';
import { CreateWasteStreamTypesDto } from 'src/wastestream-types/dto/create-wastestream-types.dto';

class VesselDto {
  @IsOptional()
  @IsNumber()
  id?: number; // existing typeId for update

  @IsNumber()
  vesselId: number;

  @IsNumber()
  tons: number;
}

class WasteStreamTypeDto extends PartialType(CreateWasteStreamTypesDto) {
  @IsOptional()
  @IsNumber()
  id?: number; // existing typeId for update

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VesselDto)
  vessels: VesselDto[];
}

export class UpdateWasteStreamsDto extends PartialType(CreateWasteStreamsDto) {
  @IsOptional()
  @IsNumber()
  id?: number; // existing typeId for update

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WasteStreamTypeDto)
  wasteStreamTypes: WasteStreamTypeDto[];
}
