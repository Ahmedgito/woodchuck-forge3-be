import { JobSite } from 'src/job-sites/domain/job-site';

export class DumpsterRefusedMmr {
  id?: number;
  jobSite?: JobSite | null;
  dumpsterLocationId?: number | null;
  dumspterSize?: number | null;
  dumspterCount?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
