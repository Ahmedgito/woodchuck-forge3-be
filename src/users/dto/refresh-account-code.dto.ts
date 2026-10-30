import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RefreshAccountCodeDto {
  @ApiProperty()
  @IsNotEmpty()
  email: string;
}
