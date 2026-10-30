import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdateGlobalDataDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  distanceMmrMacomb: number | null;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  distanceMmrLivonia: number | null;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  tonage10yrd: number | null;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  tonage20yrd: number | null;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  tonage30yrd: number | null;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  tonage40yrd: number | null;

  @ApiProperty()
  @IsOptional()
  supervisorOnboarding: string | null;

  @ApiProperty()
  @IsOptional()
  autoResponse: string | null;
}
