import { JobSite } from '../../job-sites/domain/job-site';

export class Sms {
  id: string;
  jobSite: JobSite;
  orignalSms: string;
  orignalResp: JSON | null;
}
