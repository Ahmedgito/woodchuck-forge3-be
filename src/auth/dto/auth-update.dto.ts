import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';

export class AuthUpdateDto extends PartialType(UpdateUserDto) {
  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  oldPassword?: string;
}
