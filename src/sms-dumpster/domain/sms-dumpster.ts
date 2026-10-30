import { JobSite } from '../../job-sites/domain/job-site';
import { Sms } from '../../sms/domain/sms';
import { Dumpster } from '../../dumpster/domain/dumpster';
import { SmsDumpsterStatusesEnum } from '../sms-dumpster-statuses.enum';

export class SmsDumpster {
  id: string;
  sms: Sms;
  jobSite: JobSite;
  dumpster: Dumpster;
  status: SmsDumpsterStatusesEnum;
  details: JSON;
}
