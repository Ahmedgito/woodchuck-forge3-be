import { Camera } from 'src/cameras/domain/camera';
import { AlertToType } from '../alertToType.enum';

export class JobSiteCameras {
  id: number;
  name: string;
  maxLevel: number;
  alertTo?: number;
  alertToType?: AlertToType;
  camera?: Camera;
}
