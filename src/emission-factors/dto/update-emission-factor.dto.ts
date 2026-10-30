import { PartialType } from '@nestjs/swagger';
import { CreateEmissionFactorDto } from './create-emission-factor.dto';

export class UpdateEmissionFactorDto extends PartialType(
  CreateEmissionFactorDto,
) {}

