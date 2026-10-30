import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddressDataDto {
  @ApiProperty()
  @IsNotEmpty()
  addressFull: string;

  @ApiProperty()
  @IsNotEmpty()
  addressLine1: string;

  @ApiProperty({ required: false })
  @IsOptional()
  addressLine2: string | null;

  @ApiProperty()
  @IsOptional()
  city: string;

  @ApiProperty()
  @IsOptional()
  state: string;

  @ApiProperty()
  @IsOptional()
  postalCode: string;

  @ApiProperty()
  @IsOptional()
  country: string;

  @ApiProperty({ required: false })
  @IsOptional()
  placeId: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  lat: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  lng: number;
}
