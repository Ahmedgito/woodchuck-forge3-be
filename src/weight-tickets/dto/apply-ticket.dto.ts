import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ApplyTicketDto {
  @ApiProperty({ description: 'Job site waste stream ID' })
  @IsNotEmpty()
  @IsNumber()
  wasteStreamId: number;

  @ApiProperty({ description: 'Ticket date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({ description: 'Tonnage from ticket' })
  @IsNotEmpty()
  @IsNumber()
  tonnage: number;

  @ApiProperty({ description: 'add — new confirmed dumpster; overwrite — replace last estimated/confirmed' })
  @IsNotEmpty()
  @IsIn(['add', 'overwrite'])
  action: 'add' | 'overwrite';
}
