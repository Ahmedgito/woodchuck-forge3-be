import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
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
import { RoleDto } from 'src/roles/dto/role.dto';
import { StatusDto } from 'src/statuses/dto/status.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'test1' })
  //@Transform(lowerCaseTransformer)
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'test1@example.com' })
  @Transform(lowerCaseTransformer)
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @MinLength(6)
  @IsOptional()
  password?: string;

  //provider?: string;

  //socialId?: string | null;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  company: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty() //{ type: () => FileDto }
  @IsOptional()
  photo?: string; //FileDto

  @ApiProperty({ type: RoleDto })
  @IsNotEmpty()
  @Type(() => RoleDto)
  @Transform(({ value }) => {
    // Handle both cases: already object, or JSON string
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  role: RoleDto | null;

  //@ApiProperty({ type: StatusDto })
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;

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

  hash?: string | null;

  @ApiProperty({ required: false, type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  isSubUser?: boolean;

  @ApiProperty({ required: false, type: Number })
  @IsOptional()
  @Type(() => Number)
  parentUserId?: number;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  file?: any;
}
