import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateSmsDumpsterDto } from './create-sms-dumpster.dto';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { SmsDumpsterStatusesEnum } from '../sms-dumpster-statuses.enum';

export class UpdateSmsDumpsterDto extends PartialType(CreateSmsDumpsterDto) {
  @IsEnum(SmsDumpsterStatusesEnum)
  @IsNotEmpty()
  @ApiProperty({ enum: SmsDumpsterStatusesEnum })
  status: string;
}
