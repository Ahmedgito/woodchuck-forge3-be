import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { StatusDto } from 'src/statuses/dto/status.dto';

export class CreateJobSiteDto {
  @ApiProperty()
  @IsNotEmpty()
  street: string | null;

  @ApiProperty()
  @IsNotEmpty()
  city: string | null;

  @ApiProperty()
  @IsNotEmpty()
  state: string | null;

  @ApiProperty()
  @IsNotEmpty()
  zipcode: string | null;

  @ApiProperty()
  @IsNotEmpty()
  name: string | null;

  @ApiProperty()
  @IsNotEmpty()
  phone: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  sizeSqft: number | null;

  @ApiProperty()
  @IsNotEmpty()
  // @IsDate()
  completedAt: Date;

  @ApiProperty()
  @IsNotEmpty()
  // @IsDate()
  startDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  clientId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  haulerId: number;

  @ApiProperty({ type: StatusDto })
  @Type(() => StatusDto)
  status?: StatusDto;

  woodWasteRecycled: number | null;
  diverted: number | null;
  refused: number | null;
  co2Avoided: number | null;
  totalHailed: number | null;
  totalTonnage: number | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  mmrLocation: number | null;

  @ApiProperty()
  @IsNotEmpty()
  title: string | null;

  biomassForCleanEnergy: number | null;
  plastic: number | null;
  metal: number | null;
  wasteHauling: number | null;
  cardBoard: number | null;
  concrete: number | null;
  woodWasteDiverted: number | null;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  endClientId: number | null;
}
