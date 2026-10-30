import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional } from 'class-validator';
import { StatusDto } from 'src/statuses/dto/status.dto';

export class UpdateJobSiteDto {
  @ApiProperty()
  @IsOptional()
  street: string | null;

  @ApiProperty()
  @IsOptional()
  city: string | null;

  @ApiProperty()
  @IsOptional()
  state: string | null;

  @ApiProperty()
  @IsOptional()
  zipcode: string | null;

  @ApiProperty()
  @IsOptional()
  name: string | null;

  @ApiProperty()
  @IsOptional()
  phone: string | null;

  @ApiProperty()
  @IsOptional()
  @IsEmail()
  email: string | null;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  sizeSqft: number | null;

  @ApiProperty()
  @IsOptional()
  // @IsDate()
  completedAt: Date;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  clientId: number;

  @ApiProperty()
  @IsOptional()
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
  @IsOptional()
  @IsNumber()
  mmrLocation: number | null;

  @ApiProperty()
  @IsOptional()
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
