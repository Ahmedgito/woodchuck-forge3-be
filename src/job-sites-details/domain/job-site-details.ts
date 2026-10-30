import { JobSite } from 'src/job-sites/domain/job-site';
import { PowerPlants } from 'src/power-plants/domain/power-plants';

export class JobSiteDetails {
  id: number;
  jobSite: JobSite;
  address: string | null;
  sustainabilityGoal: number | null;
  size: string | null;
  completionBy: Date;
  powerplants: PowerPlants | null;
  createdAt: Date;
  updatedAt: Date;
}
