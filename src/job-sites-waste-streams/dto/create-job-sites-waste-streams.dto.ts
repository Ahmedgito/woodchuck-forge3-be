import { ApiProperty } from '@nestjs/swagger';
import { WasteStreams } from '../../wastestreams/domain/wastestreams';
import { Locations } from '../../locations/domain/locations';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { DumpsterTypeEnum } from '../dumpsterType.enum';
import { JobSite } from 'src/job-sites/domain/job-site';
import { Dumpster } from 'src/dumpster/domain/dumpster';
import { Hauler } from 'src/haulers/domain/hauler';
import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { EitherOr } from '../utils/is-delivery-location-set';
import { CreateWasteStreamCameraDto } from 'src/wastestream-cameras/dto/create-wastestream-cameras.dto';
import { Type } from 'class-transformer';
import { CreateJobsiteWasteStreamLocationDto } from 'src/job-site-waste-stream-locations/dto/create-waste-stream-locations.dto';
import { WasteStreamTypes } from 'src/wastestream-types/domain/wastestream-types';

export class CreateJobSitesWasteStreamsDto {
  @ApiProperty({ enum: DumpsterTypeEnum })
  // @IsNotEmpty()
  dumpster_type: DumpsterTypeEnum;

  @ApiProperty()
  // @IsNotEmpty()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  distance: number;

  @ApiProperty()
  @IsNotEmpty()
  jobSiteId?: JobSite['id'];

  @ApiProperty()
  @IsNotEmpty()
  wastestreamsId?: WasteStreams['id'];

  @ApiProperty()
  @IsOptional()
  @EitherOr('powerplantId', {
    message: 'Either field1 or field2 must be filled, but not both.',
  })
  locationId?: Locations['id'];

  @ApiProperty()
  @IsOptional()
  @EitherOr('locationId', {
    message: 'Either field1 or field2 must be filled, but not both.',
  })
  //@Validate(IsOnlyOneFieldFilled, ['locationId'])
  powerplantId?: PowerPlants['id'];

  @ApiProperty()
  @IsNotEmpty()
  dumpsterId?: Dumpster['id'];

  @ApiProperty()
  // @IsNotEmpty()
  @IsOptional()
  haulerId?: Hauler['id'];

  @ApiProperty()
  @IsOptional()
  co2?: number;

  @ApiProperty()
  @IsOptional()
  recycling_rebate?: number;

  @ApiProperty({ default: false })
  @IsOptional()
  reports_enabled?: boolean;

  @ApiProperty()
  @IsNotEmpty()
  vesselId: number;

  @ApiProperty()
  @IsNotEmpty()
  vesselOptionId: number;

  @ApiProperty()
  @IsNotEmpty()
  wasteStreamTypeId?: WasteStreamTypes['id'];

  @ApiProperty({ type: CreateWasteStreamCameraDto, required: false })
  @IsOptional()
  @Type(() => CreateWasteStreamCameraDto)
  wasteStreamCameras?: CreateWasteStreamCameraDto;

  @ApiProperty({ type: [CreateJobsiteWasteStreamLocationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobsiteWasteStreamLocationDto)
  wasteStreamLocations?: CreateJobsiteWasteStreamLocationDto[];
}
