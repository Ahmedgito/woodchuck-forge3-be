import { PartialType } from '@nestjs/swagger';
import { CreateHaulerDto } from './create-hauler.dto';
import { IsEmail, IsOptional, IsPhoneNumber } from 'class-validator';

export class UpdateHaulerDto extends PartialType(CreateHaulerDto) {
  @IsOptional()
  name?: string;

  // @ApiProperty({ type: HaulerTypeDto })
  // @Is()
  // @Type(() => HaulerTypeDto)
  // haulerType?: HaulerTypeDto;

  /*  @ApiProperty({ examples: DumpsterSize })
  @IsOptional()
  @IsArray()
  //@IsIn(DumpsterSize.map((item) => item.value))
  dumpsterSize?: JSON;*/

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  street?: string;

  @IsOptional()
  city?: string;

  @IsOptional()
  state?: string;

  @IsOptional()
  zip?: string;

  @IsOptional()
  country?: string;
}
