import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { HaulerType } from '../domain/haulertype';
export class HaulerTypeDto implements HaulerType {
  @ApiProperty()
  @IsNumber()
  id?: number;
}
