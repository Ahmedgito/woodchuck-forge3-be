import { Vessel } from 'src/vessels/domain/vessel';

export class VesselOptions {
  id: number;
  value: number;
  vesselId: Vessel['id'];
}
