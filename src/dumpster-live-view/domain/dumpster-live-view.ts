import { JobSite } from 'src/job-sites/domain/job-site';

export class DumpsterLiveView {
  id?: number;
  jobSite?: JobSite | null;
  s3ImageUrl?: string | null;
  fillPercentage?: number | null;
  gateId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
