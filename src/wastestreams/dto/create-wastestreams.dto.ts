import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateWasteStreamsDto {
  @ApiProperty()
  @IsNotEmpty()
  //   @Max(50)
  //   @Min(3)
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  tonPerOffRoleYard: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  tonPerFrontLoadYard: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  tonPerCompactorYard: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsHexColor()
  colorCodeEst: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsHexColor()
  colorCodeReal: string;
}
