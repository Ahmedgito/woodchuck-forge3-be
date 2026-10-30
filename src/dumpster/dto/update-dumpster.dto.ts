import { PartialType } from '@nestjs/swagger';
import { CreateDumpsterDto } from './create-dumpster.dto';

export class UpdateDumpsterDto extends PartialType(CreateDumpsterDto) {}
