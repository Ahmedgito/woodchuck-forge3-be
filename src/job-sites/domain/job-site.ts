import { Dumpster } from 'src/dumpster/domain/dumpster';
import { JobSiteDetails } from 'src/job-sites-details/domain/job-site-details';
import { Status } from 'src/statuses/domain/status';
import { User } from 'src/users/domain/user';

export class JobSite {
  id: number;
  clientId: User['id'];
  street: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;

  title: string | null;
  createdAt: Date;
  updatedAt: Date;

  sizeSqft: number | null;
  completedAt: Date;
  startDate: Date;

  haulerId: number;
  dumpsters?: Dumpster[];

  closedAt: Date;
  status?: Status;
  woodWasteRecycled: number | null;
  diverted: number | null;
  refused: number | null;
  co2Avoided: number | null;
  totalHailed: number | null;
  totalTonnage: number | null;
  mmrLocation: number | null;
  jobSiteDetails?: JobSiteDetails | null;

  biomassForCleanEnergy: number | null;
  plastic: number | null;
  metal: number | null;
  wasteHauling: number | null;
  cardBoard: number | null;
  concrete: number | null;
  woodWasteDiverted: number | null;
  endClientId: number | null;

  photo?: string | null;
}
