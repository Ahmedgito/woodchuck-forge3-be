import {
  IsNotEmpty,
  IsNumber,
  Matches,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddressDataDto } from 'src/address/dto/address-data.dto';

export class CreatePowerPlantsDto {
  @ApiProperty()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9 ]*$/, {
    message: 'Name can only contain alphanumeric characters and spaces',
  })
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  kwhPerTon: number;

  @ApiProperty({ type: AddressDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDataDto)
  address?: AddressDataDto;
}
