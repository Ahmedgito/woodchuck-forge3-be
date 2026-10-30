import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDataDto } from 'src/address/dto/address-data.dto';

export class CreateJobSiteDetailsDto {
  @ApiProperty()
  @IsNotEmpty()
  title: string | null;

  @ApiProperty({ type: AddressDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDataDto)
  address: AddressDataDto;

  @ApiProperty()
  @IsNotEmpty()
  name: string | null;

  @ApiProperty()
  @IsNotEmpty()
  phone: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  size: number | null;

  @ApiProperty()
  @IsOptional()
  // @IsDate()
  completionBy: Date;

  @ApiProperty()
  @IsOptional()
  // @IsDate()
  startDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  clientId: number;

  @ApiProperty()
  @IsNotEmpty()
  sustainabilityGoal: number | null;

  // @ApiProperty()
  // @IsNotEmpty()
  // @IsNumber()
  // powerplants: PowerPlants['id'];

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  endClientId: number | null;
}
