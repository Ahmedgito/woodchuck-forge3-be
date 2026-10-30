import { HaulerType } from '../../haulertype/domain/haulertype';

export class Hauler {
  id?: number;
  name?: string;
  haulerType?: HaulerType;
  dumpsterSize?: JSON | null;
  phone?: string;
  email?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}
