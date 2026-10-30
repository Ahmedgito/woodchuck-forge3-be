import {
  IsArray,
  IsOptional,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class VesselOptionDto {
  @IsOptional() // If missing → new option
  @IsNumber()
  id?: number;

  @IsNumber()
  value: number;
}

class VesselDto {
  @IsOptional() // If missing → new vessel
  @IsNumber()
  id?: number;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VesselOptionDto)
  options: VesselOptionDto[];
}

export class SaveVesselDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VesselDto)
  vessels: VesselDto[];
}
