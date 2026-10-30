import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmissionFactorDto {
  @ApiProperty({ example: 'CO2 Emission Factor' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'co2_emission_factor' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  key: string;

  @ApiProperty({ example: '0.92' })
  @IsNotEmpty()
  @IsString()
  value: string;
}

