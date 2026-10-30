import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty } from 'class-validator';

export class CreateWasteStreamTypesDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsHexColor()
  colorCodeEst: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsHexColor()
  colorCodeReal: string;
}
