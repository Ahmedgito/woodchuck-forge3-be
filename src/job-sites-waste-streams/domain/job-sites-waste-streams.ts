// import wast streams
import { WasteStreams } from '../../wastestreams/domain/wastestreams';
import { Dumpster } from '../../dumpster/domain/dumpster';
import { Hauler } from '../../haulers/domain/hauler';
import { DumpsterTypeEnum } from '../dumpsterType.enum';
import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { WasteStreamCameras } from 'src/wastestream-cameras/domain/wastestream-cameras';
import { JobsiteWasteStreamLocations } from 'src/job-site-waste-stream-locations/domain/job-site-waste-stream-locations';
import { WasteStreamTypes } from 'src/wastestream-types/domain/wastestream-types';

export class JobSiteWasteStreams {
  id: number;
  wasteStreams?: WasteStreams;
  dumpster_type: DumpsterTypeEnum;
  locations?: JobsiteWasteStreamLocations[];
  powerplants?: PowerPlants;
  dumpster?: Dumpster;
  distance: number;
  hauler?: Hauler;
  order?: number | null;
  co2?: number | null;
  recycling_rebate?: number | null;
  reports_enabled?: boolean;
  wasteStreamCameras?: WasteStreamCameras;
  wasteStreamLocations?: JobsiteWasteStreamLocations[];
}
