import { JobSite } from 'src/job-sites/domain/job-site';
import { ReportTypeEnum } from '../report-types.enum';
import { ReportFrequencyEnum } from '../report-frequency.enum';
import { ReportFormatEnum } from '../report-format.enum';
import { CompressionExtensionEnum } from '../compression-extension.enum';
import { User } from 'src/users/domain/user';

export class ReportSubscription {
  id: number;
  user: User;
  reportType: ReportTypeEnum;
  jobSite: JobSite | null;
  frequency: ReportFrequencyEnum;
  formats: ReportFormatEnum[];
  compressionExtension: CompressionExtensionEnum;
  reportCcEmails: string[];
  isActive: boolean;
}
