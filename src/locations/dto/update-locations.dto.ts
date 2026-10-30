import { PartialType } from '@nestjs/swagger';
import { CreateLocationsDto } from './create-locations.dto';

export class UpdateLocationsDto extends PartialType(CreateLocationsDto) {}
