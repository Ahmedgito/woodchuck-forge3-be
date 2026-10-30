import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { lowerCaseTransformer } from 'src/utils/transformers/lower-case.transformer';

export class CreateSubUserDto {
  @ApiProperty({ example: 'test1' })
  //@Transform(lowerCaseTransformer)
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'test1@example.com' })
  @Transform(lowerCaseTransformer)
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsPhoneNumber()
  phone: string;
}
