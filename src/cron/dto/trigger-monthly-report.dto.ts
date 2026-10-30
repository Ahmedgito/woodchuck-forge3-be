import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEmail, IsOptional } from 'class-validator';

export class TriggerMonthlyReportDto {
  @ApiProperty({
    type: [String],
    required: false,
    description:
      'If provided, only users with these emails will receive the monthly report. Omit to send to all active subscribers.',
    example: ['user1@example.com', 'user2@example.com'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEmail({}, { each: true })
  emails?: string[];
}
