import { Camera } from 'src/cameras/domain/camera';
import { JobSiteWasteStreams } from 'src/job-sites-waste-streams/domain/job-sites-waste-streams';
import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { Locations } from 'src/locations/domain/locations';
import { Hauler } from 'src/haulers/domain/hauler';

export class JobsiteWasteStreamLocations {
  id: number;
  type: number;
  distance?: number;
  location?: Locations;
  powerplant?: PowerPlants;
  hauler?: Hauler;
  camera?: Camera;
  jobSiteWasteStream?: JobSiteWasteStreams;
}
