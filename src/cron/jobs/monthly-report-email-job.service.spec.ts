import { ReportEmailJobService } from './monthly-report-email-job.service';
import { RoleEnum } from 'src/roles/roles.enum';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import { ReportTypeEnum } from 'src/report-subscriptions/report-types.enum';

/**
 * Each subscription carries its own CC list (report_subscriptions.reportCcEmails).
 * These cover the list reaching the report job intact, and the one case where
 * several subscriptions collapse into a single email — an admin's consolidated
 * multi-site report — where the lists must merge without duplicating anyone.
 */
describe('ReportEmailJobService subscription cc lists', () => {
  let service: ReportEmailJobService;
  let generateReport: jest.Mock;
  let cronJobs: any[];

  const clientUser = (id: number) => ({
    id,
    email: `client${id}@example.com`,
    role: { id: RoleEnum.general_contractor },
  });
  const adminUser = (id: number) => ({
    id,
    email: `admin${id}@example.com`,
    role: { id: RoleEnum.admin },
  });

  const jobSiteSub = (over: any = {}) => ({
    user: clientUser(1),
    reportType: ReportTypeEnum.JOB_SITE,
    jobSite: { id: 10, title: 'Site A', startDate: '2024-01-01' },
    formats: [ReportFormatEnum.EXCEL],
    reportCcEmails: ['dre@woodchuck.ai'],
    ...over,
  });

  const build = (weeklySubs: any[]) => {
    generateReport = jest.fn(() => Promise.resolve());
    cronJobs = [];
    return new ReportEmailJobService(
      {
        getActiveWeeklySubscriptions: jest.fn(() =>
          Promise.resolve(weeklySubs),
        ),
        getActiveMonthlySubscriptions: jest.fn(() => Promise.resolve([])),
      } as any,
      { closePuppeteerBrowser: jest.fn() } as any,
      { get: jest.fn(() => undefined) } as any,
      // Capture the cron jobs so they can be stopped — the constructor starts
      // them, and a live timer would leak out of the test run.
      {
        addCronJob: jest.fn((_n: string, job: any) => cronJobs.push(job)),
      } as any,
      { generateReport } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
    );
  };

  afterEach(() => {
    cronJobs.forEach((j) => j?.stop?.());
    jest.clearAllMocks();
  });

  it('should carry a subscription cc list onto its report job', async () => {
    service = build([jobSiteSub()]);

    await service.handleWeeklyReportEmails();

    expect(generateReport).toHaveBeenCalledTimes(1);
    expect(generateReport.mock.calls[0][0].reportCcEmails).toEqual([
      'dre@woodchuck.ai',
    ]);
  });

  it('should send an empty cc list when the subscription has none', async () => {
    service = build([jobSiteSub({ reportCcEmails: [] })]);

    await service.handleWeeklyReportEmails();

    expect(generateReport.mock.calls[0][0].reportCcEmails).toEqual([]);
  });

  it('should tolerate a subscription predating the column', async () => {
    service = build([jobSiteSub({ reportCcEmails: undefined })]);

    await service.handleWeeklyReportEmails();

    expect(generateReport.mock.calls[0][0].reportCcEmails).toEqual([]);
  });

  it('should merge cc lists when several sites collapse into one admin email', async () => {
    const admin = adminUser(9);
    service = build([
      jobSiteSub({
        user: admin,
        jobSite: { id: 10, title: 'A', startDate: '2024-01-01' },
        reportCcEmails: ['dre@woodchuck.ai'],
      }),
      jobSiteSub({
        user: admin,
        jobSite: { id: 11, title: 'B', startDate: '2024-01-01' },
        reportCcEmails: ['sam@woodchuck.ai'],
      }),
    ]);

    await service.handleWeeklyReportEmails();

    expect(generateReport).toHaveBeenCalledTimes(1);
    expect(generateReport.mock.calls[0][0].reportCcEmails.sort()).toEqual([
      'dre@woodchuck.ai',
      'sam@woodchuck.ai',
    ]);
  });

  it('should not repeat an address shared by two merged subscriptions', async () => {
    const admin = adminUser(9);
    service = build([
      jobSiteSub({
        user: admin,
        jobSite: { id: 10, title: 'A', startDate: '2024-01-01' },
        reportCcEmails: ['dre@woodchuck.ai'],
      }),
      jobSiteSub({
        user: admin,
        jobSite: { id: 11, title: 'B', startDate: '2024-01-01' },
        reportCcEmails: ['DRE@woodchuck.ai'],
      }),
    ]);

    await service.handleWeeklyReportEmails();

    expect(generateReport.mock.calls[0][0].reportCcEmails).toEqual([
      'dre@woodchuck.ai',
    ]);
  });

  it('should carry a dashboard subscription cc list onto its report job', async () => {
    service = build([
      {
        user: clientUser(1),
        reportType: ReportTypeEnum.DASHBOARD,
        jobSite: null,
        formats: [ReportFormatEnum.EXCEL],
        reportCcEmails: ['dre@woodchuck.ai'],
      },
    ]);

    await service.handleWeeklyReportEmails();

    expect(generateReport.mock.calls[0][0]).toMatchObject({
      type: 'dashboard',
      reportCcEmails: ['dre@woodchuck.ai'],
    });
  });
});
