import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationsTypeEnum } from '../locationTypes.enum';
import { LocationsToTypesEnum } from '../locationToTypes.enum';
import { AddressDataDto } from 'src/address/dto/address-data.dto';

export class CreateLocationsDto {
  @ApiProperty()
  @IsNotEmpty()
  //   @Max(50)
  //   @Min(3)
  name: string;

  @ApiProperty({ enum: LocationsTypeEnum })
  @IsNotEmpty()
  type: LocationsTypeEnum;

  @ApiProperty()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  inMiles: number;

  @ApiProperty({})
  @IsOptional()
  to: number;

  @ApiProperty({ enum: LocationsToTypesEnum })
  @IsOptional()
  toType: LocationsToTypesEnum | null;

  @ApiProperty({ type: AddressDataDto, required: false })
  @IsOptional()
  // @ValidateNested()
  // @Type(() => AddressDataDto)
  address?: AddressDataDto;
}
