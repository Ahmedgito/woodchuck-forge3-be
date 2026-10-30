import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateJobSitesWasteStreamsDto } from './create-job-sites-waste-streams.dto';
import { BothOrNone } from '../utils/is-delivery-location-set';
import { Locations } from 'src/locations/domain/locations';
import { IsOptional } from 'class-validator';
import { PowerPlants } from 'src/power-plants/domain/power-plants';

export class UpdateJobSitWasteStreamsDto extends PartialType(
  CreateJobSitesWasteStreamsDto,
) {
  @ApiProperty()
  @IsOptional()
  @BothOrNone('powerplantId', {
    message: 'field1 and field2 must both be present or both be absent.',
  })
  locationId: Locations['id'];

  @ApiProperty()
  @IsOptional()
  @BothOrNone('locationId', {
    message: 'field1 and field2 must both be present or both be absent.',
  })
  //@Validate(IsOnlyOneFieldFilled, ['locationId'])
  powerplantId: PowerPlants['id'];
}
