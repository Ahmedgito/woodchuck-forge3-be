import { PartialType } from '@nestjs/swagger';
import { CreateSmsDumpDto } from './create-sms-dump.dto';

export class UpdateSmsDumpDto extends PartialType(CreateSmsDumpDto) {}
