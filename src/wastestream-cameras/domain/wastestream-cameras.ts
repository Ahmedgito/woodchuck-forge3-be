import { Camera } from 'src/cameras/domain/camera';
import { AlertToType } from '../alertToType.enum';
import { JobSiteWasteStreams } from 'src/job-sites-waste-streams/domain/job-sites-waste-streams';

export class WasteStreamCameras {
  id: number;
  maxLevel: number;
  alertTo?: number;
  alertToType?: AlertToType;
  additionalCamera?: Camera;
  confidenceLevel?: number;
  camera?: Camera;
  jobsiteWasteStream?: JobSiteWasteStreams;
}
