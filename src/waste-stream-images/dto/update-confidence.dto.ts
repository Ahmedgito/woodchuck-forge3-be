import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateConfidenceDto {
  @ApiProperty({
    description: 'Admin-overridden confidence level (0–100)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  adminConfidenceOverride: number;
}
