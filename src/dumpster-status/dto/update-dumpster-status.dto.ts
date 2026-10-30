import { PartialType } from '@nestjs/swagger';
import { CreateDumpsterStatusDto } from './create-dumpster-status.dto';

export class UpdateDumpsterStatusDto extends PartialType(
  CreateDumpsterStatusDto,
) {}
