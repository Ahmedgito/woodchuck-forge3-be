import { IsEmail, IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HaulerTypeDto } from 'src/haulertype/dto/haulerType.dto';
import { Type } from 'class-transformer';

export class CreateHaulerDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  //haulerType?: HaulerType;
  @ApiProperty({ type: HaulerTypeDto })
  //@IsNotEmpty()
  @Type(() => HaulerTypeDto)
  haulerType?: HaulerTypeDto;

  /*  @ApiProperty({ examples: DumpsterSize })
  @IsNotEmpty()
  @IsArray()
  //@IsIn(DumpsterSize.map((item) => item.value))
  dumpsterSize: JSON;*/

  @ApiProperty()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  address?: string;

  @ApiProperty()
  // @IsNotEmpty()
  street: string;

  @ApiProperty()
  // @IsNotEmpty()
  city: string;

  @ApiProperty()
  // @IsNotEmpty()
  state: string;

  @ApiProperty()
  // @IsNotEmpty()
  zip: string;

  @ApiProperty()
  // @IsNotEmpty()
  country: string;
}
