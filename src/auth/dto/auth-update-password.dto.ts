import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class AuthUpdatePasswordDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  userId?: number;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;
}
