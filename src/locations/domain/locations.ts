import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { LocationsToTypesEnum } from '../locationToTypes.enum';
import { LocationsTypeEnum } from '../locationTypes.enum';

export class Locations {
  id: number;
  name: string;
  type: LocationsTypeEnum;
  inMiles: number | null;
  to: Locations['id'] | PowerPlants['id'] | null;
  toType: LocationsToTypesEnum | null;
}
