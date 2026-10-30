import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthAutoLoginDto {
  @ApiProperty({
    description: 'The temporary auto-login token received after password reset',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}


