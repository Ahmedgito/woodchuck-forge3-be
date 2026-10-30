import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsAlphanumeric,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { lowerCaseTransformer } from 'src/utils/transformers/lower-case.transformer';
import { IsUniqueEmail } from '../utils/unique-validation.ts';

export class UpdateUserDto {
  @ApiProperty({ example: 'test1', required: false })
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'test1@example.com', required: false })
  @IsOptional()
  @Transform(lowerCaseTransformer)
  @IsEmail()
  @IsUniqueEmail()
  email?: string;

  provider?: string;

  socialId?: string | null;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNotEmpty()
  company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ required: false }) //{ type: () => FileDto }
  @IsOptional()
  photo?: string; //FileDto

  @ApiProperty({ required: false })
  @IsOptional()
  billing_details_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  billing_details_street?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  billing_details_city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  billing_details_state?: string;

  @ApiProperty({ required: false })
  @ValidateIf(
    (o) =>
      o.billing_details_zipcode !== undefined &&
      o.billing_details_zipcode !== '',
  )
  @IsOptional()
  @IsAlphanumeric()
  billing_details_zipcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  billing_details_country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  hash?: string | null;
  @ApiProperty({ required: false, type: Boolean })
  @IsOptional()
  isSubUser?: boolean;

  @ApiProperty({ required: false, type: Number })
  @IsOptional()
  parentUserId?: number;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  file?: any;
}
