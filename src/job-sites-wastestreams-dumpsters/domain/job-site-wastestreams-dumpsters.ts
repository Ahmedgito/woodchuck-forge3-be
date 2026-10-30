import { JobSiteWasteStreams } from 'src/job-sites-waste-streams/domain/job-sites-waste-streams';

export class JobSiteWastestreamsDumpsters {
  id: number;
  jobSiteWastestreams: JobSiteWasteStreams;
  estimated_weight: number | null;
  real_weight: number | null;
  creationDate: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
