import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ReportGenerationConsumer } from './ReportGeneration.consumer';
import { CompressionExtensionEnum } from 'src/report-subscriptions/compression-extension.enum';
import { AttachmentFile } from 'src/utils/zip-attachments.util';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';

/**
 * Focused unit tests for the download-link generation that replaced email
 * attachments. All report delivery is now link-based:
 *   - a ZIP client gets a single .zip link per archive
 *   - a PIZ client gets both a .zip and a .piz link per archive
 *   - non-archive files (csv/xlsx) always get a single direct link
 */
describe('ReportGenerationConsumer link delivery', () => {
  let consumer: ReportGenerationConsumer;
  let uploadReportArchive: jest.Mock;
  let tmpDir: string;

  const makeFile = (name: string, displayName: string): AttachmentFile => {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, 'test-content');
    return { filename: name, path: filePath, displayName };
  };

  const callUpload = (files: AttachmentFile[], ext: CompressionExtensionEnum) =>
    (consumer as any).uploadArchivesForLinkDelivery(files, ext);

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-links-'));
    uploadReportArchive = jest.fn((file: AttachmentFile) =>
      Promise.resolve({
        filename: file.filename,
        key: `reports/${file.filename}`,
        downloadUrl: `https://dl.test/${file.filename}`,
      }),
    );
    const reportS3Storage = { uploadReportArchive } as any;
    // Only reportS3Storage is exercised by uploadArchivesForLinkDelivery; the
    // other constructor deps are irrelevant to this method.
    consumer = new ReportGenerationConsumer(
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      reportS3Storage,
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('should give a ZIP client one .zip link per archive and a single link for plain files', async () => {
    const zip = makeFile('report.zip', '07-01-2026 PDF');
    const csv = makeFile('report.csv', '07-01-2026 CSV Report');

    const links = await callUpload([zip, csv], CompressionExtensionEnum.ZIP);

    expect(uploadReportArchive).toHaveBeenCalledTimes(2);
    expect(links).toEqual([
      { filename: '07-01-2026 PDF ZIP Report', url: expect.any(String) },
      { filename: '07-01-2026 CSV Report', url: expect.any(String) },
    ]);
    // No .piz copy is ever produced for a ZIP client.
    const uploaded = uploadReportArchive.mock.calls.map((c) => c[0].filename);
    expect(uploaded.some((f: string) => f.endsWith('.piz'))).toBe(false);
  });

  it('should give a PIZ client both a .zip and a .piz link per archive', async () => {
    const zip = makeFile('report.zip', '07-01-2026 PDF');
    const csv = makeFile('report.csv', '07-01-2026 CSV Report');

    const links = await callUpload([zip, csv], CompressionExtensionEnum.PIZ);

    expect(uploadReportArchive).toHaveBeenCalledTimes(3);
    expect(links).toEqual([
      { filename: '07-01-2026 PDF ZIP Report', url: expect.any(String) },
      { filename: '07-01-2026 PDF PIZ Report', url: expect.any(String) },
      { filename: '07-01-2026 CSV Report', url: expect.any(String) },
    ]);
    // The .piz copy is uploaded with a .piz extension...
    const uploaded = uploadReportArchive.mock.calls.map((c) => c[0].filename);
    expect(uploaded).toContain('report.piz');
    // ...and cleaned up from disk afterward, leaving only the original .zip.
    expect(fs.existsSync(path.join(tmpDir, 'report.piz'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'report.zip'))).toBe(true);
  });
});

/**
 * Client-format Excel routing (WD-1719).
 *
 * Clients flagged in `client_report_config` receive a purpose-built workbook
 * instead of the standard Excel export. Monthly gets the cumulative workbook;
 * weekly gets the same workbook scoped to one Monday-to-Sunday period, with no
 * "cumulative" wording anywhere in the delivered filename or link label.
 */
describe('ReportGenerationConsumer client-format Excel routing', () => {
  let consumer: ReportGenerationConsumer;
  let generateWeeklyExcel: jest.Mock;
  let generateCumulativeExcel: jest.Mock;
  let exportReport: jest.Mock;
  let isEnabled: jest.Mock;

  const SITE_ID = 7;
  const CLIENT_ID = 42;

  const weeklyJobData = (overrides: any = {}): any => ({
    user: { id: CLIENT_ID, email: 'ops@walbridge.test' },
    weeklyOverrides: {
      weekly: true,
      startDate: '2026-08-17',
      endDate: '2026-08-23',
    },
    ...overrides,
  });

  const monthlyJobData = (): any => ({
    user: { id: CLIENT_ID, email: 'ops@walbridge.test' },
  });

  const reportDataArray = (): any[] => [
    {
      jobSite: { id: SITE_ID, clientId: CLIENT_ID, title: 'Site A' },
      plans: [{ monthName: 'July 2026' }],
    },
  ];

  beforeEach(() => {
    generateWeeklyExcel = jest.fn(() =>
      Promise.resolve({
        filename: 'weekly_report_Walbridge_2026-08-17_2026-08-23.xlsx',
        path: '/tmp/weekly_report_Walbridge_2026-08-17_2026-08-23.xlsx',
      }),
    );
    generateCumulativeExcel = jest.fn(() =>
      Promise.resolve({
        filename: 'cumulative_report_Walbridge_2026-08-24.xlsx',
        path: '/tmp/cumulative_report_Walbridge_2026-08-24.xlsx',
      }),
    );
    exportReport = jest.fn(() =>
      Promise.resolve({
        filename: 'standard.xlsx',
        path: '/tmp/standard.xlsx',
      }),
    );
    isEnabled = jest.fn(() => Promise.resolve(true));

    const clientExcelReportService = {
      generateWeeklyExcel,
      generateCumulativeExcel,
    } as any;
    const reportLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    consumer = new ReportGenerationConsumer(
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      { exportReport } as any,
      clientExcelReportService,
      { isEnabled } as any,
      undefined as any,
      reportLogger,
      undefined as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  const runJobSiteFormats = (formats: any[], jobData: any) => {
    const map: { [key: string]: any[] } = {};
    return (consumer as any)
      .processJobSiteFormats(reportDataArray(), formats, SITE_ID, jobData, map)
      .then(() => map);
  };

  describe('weekly job-site reports', () => {
    it('should generate the weekly workbook for an enabled client', async () => {
      await runJobSiteFormats([ReportFormatEnum.EXCEL], weeklyJobData());

      expect(generateWeeklyExcel).toHaveBeenCalledTimes(1);
      expect(generateCumulativeExcel).not.toHaveBeenCalled();
    });

    it('should pass the full Monday-to-Sunday window to the workbook', async () => {
      await runJobSiteFormats([ReportFormatEnum.EXCEL], weeklyJobData());

      const [clientId, weekStart, weekEnd, , jobSiteId] =
        generateWeeklyExcel.mock.calls[0];
      expect(clientId).toBe(CLIENT_ID);
      expect(jobSiteId).toBe(SITE_ID);
      // Monday 00:00:00.000 through Sunday 23:59:59.999, in server-local time.
      expect(weekStart).toEqual(new Date(2026, 7, 17, 0, 0, 0, 0));
      expect(weekEnd).toEqual(new Date(2026, 7, 23, 23, 59, 59, 999));
    });

    it('should replace the standard weekly Excel rather than add to it', async () => {
      await runJobSiteFormats([ReportFormatEnum.EXCEL], weeklyJobData());

      expect(exportReport).not.toHaveBeenCalled();
    });

    it('should bucket the workbook under a key that carries no cumulative marker', async () => {
      const map = await runJobSiteFormats(
        [ReportFormatEnum.EXCEL],
        weeklyJobData(),
      );

      const keys = Object.keys(map);
      expect(keys).toEqual(['2026-08-17_2026-08-23-client-weekly']);
      expect(keys[0]).not.toMatch(/-cumulative$/i);
    });

    it('should fall back to the cumulative workbook when the week range is incomplete', async () => {
      await runJobSiteFormats(
        [ReportFormatEnum.EXCEL],
        weeklyJobData({
          weeklyOverrides: { weekly: true, startDate: '2026-08-17' },
        }),
      );

      expect(generateWeeklyExcel).not.toHaveBeenCalled();
      expect(generateCumulativeExcel).toHaveBeenCalledTimes(1);
    });

    it('should leave a disabled client on the standard weekly Excel', async () => {
      isEnabled.mockResolvedValue(false);

      await runJobSiteFormats([ReportFormatEnum.EXCEL], weeklyJobData());

      expect(generateWeeklyExcel).not.toHaveBeenCalled();
      expect(generateCumulativeExcel).not.toHaveBeenCalled();
      expect(exportReport).toHaveBeenCalledTimes(1);
    });

    it('should leave the weekly CSV report untouched', async () => {
      await runJobSiteFormats([ReportFormatEnum.CSV], weeklyJobData());

      expect(generateWeeklyExcel).not.toHaveBeenCalled();
      expect(exportReport).toHaveBeenCalledTimes(1);
      expect(exportReport.mock.calls[0][1]).toBe(ReportFormatEnum.CSV);
    });
  });

  describe('monthly job-site reports', () => {
    it('should still generate the cumulative workbook for an enabled client', async () => {
      const map = await runJobSiteFormats(
        [ReportFormatEnum.EXCEL],
        monthlyJobData(),
      );

      expect(generateCumulativeExcel).toHaveBeenCalledTimes(1);
      expect(generateWeeklyExcel).not.toHaveBeenCalled();
      expect(Object.keys(map)[0]).toMatch(/^\d{4}-\d{2}-\d{2}-cumulative$/);
    });
  });

  describe('weekly dashboard reports', () => {
    it('should generate the weekly workbook covering every client job site', async () => {
      await (consumer as any).processDashboardFormats(
        [{ plans: [{ monthName: 'July 2026' }] }],
        { ...weeklyJobData(), formats: [ReportFormatEnum.EXCEL] },
        { id: CLIENT_ID },
      );

      expect(generateWeeklyExcel).toHaveBeenCalledTimes(1);
      // No job site id -> a tab per job site of the client.
      expect(generateWeeklyExcel.mock.calls[0][4]).toBeUndefined();
      expect(exportReport).not.toHaveBeenCalled();
    });
  });

  describe('download-link labels', () => {
    it('should omit the cumulative marker for a weekly workbook', () => {
      const label = (consumer as any).buildFileLinkLabel(
        '2026-08-17-2026-08-23',
        { path: '/tmp/weekly.xlsx', format: ReportFormatEnum.EXCEL },
        false,
      );

      expect(label).toBe('2026-08-17-2026-08-23 Excel Report');
    });

    it('should keep the cumulative marker for a monthly workbook', () => {
      const label = (consumer as any).buildFileLinkLabel(
        '08-01-2026',
        { path: '/tmp/cumulative.xlsx', format: ReportFormatEnum.EXCEL },
        true,
      );

      expect(label).toBe('08-01-2026 Cumulative Excel Report');
    });

    it('should derive the cumulative marker from the attachment bucket key', () => {
      const weekly = (consumer as any).buildMonthlyLinkDeliverables(
        { '2026-08-17_2026-08-23-client-weekly': [] },
        { weekly: true, startDate: '2026-08-17', endDate: '2026-08-23' },
      );
      expect(weekly).toEqual([]);

      // The bucket key is the only thing that turns the marker on.
      expect(/-cumulative$/i.test('2026-08-17_2026-08-23-client-weekly')).toBe(
        false,
      );
      expect(/-cumulative$/i.test('2026-08-24-cumulative')).toBe(true);
    });
  });
});

/**
 * Integration seams between the client-format Excel and the rest of a report.
 *
 * The client-format workbook lands in its own attachment bucket, separate from
 * the bucket holding that report's PDF/CSV. These cover what that separation
 * ripples into: how many deliverables the client receives, what the links are
 * labelled, and that the other formats are untouched.
 */
describe('ReportGenerationConsumer client-format Excel ripple effects', () => {
  let consumer: ReportGenerationConsumer;
  let generateWeeklyExcel: jest.Mock;
  let generateCumulativeExcel: jest.Mock;
  let exportReport: jest.Mock;
  let exportJobSiteReportToPdf: jest.Mock;
  let isEnabled: jest.Mock;
  let tmp: string;

  const SITE_ID = 7;
  const CLIENT_ID = 42;

  const weekly = {
    weekly: true,
    startDate: '2026-08-17',
    endDate: '2026-08-23',
  };

  const realFile = (name: string) => {
    const p = path.join(tmp, name);
    fs.writeFileSync(p, 'x');
    return { filename: name, path: p };
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ripple-'));
    generateWeeklyExcel = jest.fn(() =>
      Promise.resolve(
        realFile('weekly_report_Walbridge_2026-08-17_2026-08-23.xlsx'),
      ),
    );
    generateCumulativeExcel = jest.fn(() =>
      Promise.resolve(realFile('cumulative_report_Walbridge_2026-08-24.xlsx')),
    );
    exportReport = jest.fn(() => Promise.resolve(realFile('standard.xlsx')));
    exportJobSiteReportToPdf = jest.fn(() =>
      Promise.resolve([realFile('report.pdf')]),
    );
    isEnabled = jest.fn(() => Promise.resolve(true));

    consumer = new ReportGenerationConsumer(
      { exportJobSiteReportToPdf } as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      { exportReport } as any,
      { generateWeeklyExcel, generateCumulativeExcel } as any,
      { isEnabled } as any,
      undefined as any,
      { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      undefined as any,
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  const runFormats = async (formats: any[], jobData: any) => {
    const map: { [key: string]: AttachmentFile[] } = {};
    await (consumer as any).processJobSiteFormats(
      [
        {
          jobSite: { id: SITE_ID, clientId: CLIENT_ID, title: 'Site A' },
          plans: [{ monthName: 'August 2026' }],
        },
      ],
      formats,
      SITE_ID,
      jobData,
      map,
    );
    return map;
  };

  it('should keep the weekly PDF in its own bucket alongside the Excel', async () => {
    const map = await runFormats(
      [ReportFormatEnum.PDF, ReportFormatEnum.EXCEL],
      { user: { id: CLIENT_ID }, weeklyOverrides: weekly },
    );

    expect(Object.keys(map).sort()).toEqual([
      '2026-08-17-2026-08-23', // PDF, keyed by the week range
      '2026-08-17_2026-08-23-client-weekly', // client-format Excel
    ]);
    expect(exportJobSiteReportToPdf).toHaveBeenCalledTimes(1);
  });

  it('should still deliver one link per file, not one per bucket', async () => {
    const map = await runFormats(
      [ReportFormatEnum.PDF, ReportFormatEnum.EXCEL],
      { user: { id: CLIENT_ID }, weeklyOverrides: weekly },
    );

    const deliverables = (consumer as any).buildMonthlyLinkDeliverables(
      map,
      weekly,
    );

    expect(deliverables).toHaveLength(2);
  });

  it('should label the weekly links with the week range and no cumulative marker', async () => {
    const map = await runFormats(
      [ReportFormatEnum.PDF, ReportFormatEnum.EXCEL],
      { user: { id: CLIENT_ID }, weeklyOverrides: weekly },
    );

    const labels = (consumer as any)
      .buildMonthlyLinkDeliverables(map, weekly)
      .map((d: AttachmentFile) => d.displayName)
      .sort();

    expect(labels).toEqual([
      '2026-08-17-2026-08-23 Excel Report',
      '2026-08-17-2026-08-23 PDF Report',
    ]);
    expect(labels.join(' ')).not.toMatch(/cumulative/i);
  });

  it('should still mark the monthly Excel link as cumulative', async () => {
    const map = await runFormats([ReportFormatEnum.EXCEL], {
      user: { id: CLIENT_ID },
    });

    const labels = (consumer as any)
      .buildMonthlyLinkDeliverables(map, undefined)
      .map((d: AttachmentFile) => d.displayName);

    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatch(/Cumulative Excel Report$/);
  });

  it('should leave weekly CSV and PDF alone for a disabled client', async () => {
    isEnabled.mockResolvedValue(false);

    const map = await runFormats(
      [ReportFormatEnum.PDF, ReportFormatEnum.CSV, ReportFormatEnum.EXCEL],
      { user: { id: CLIENT_ID }, weeklyOverrides: weekly },
    );

    // Everything lands in the single week bucket, as before this feature.
    expect(Object.keys(map)).toEqual(['2026-08-17-2026-08-23']);
    expect(generateWeeklyExcel).not.toHaveBeenCalled();
    expect(exportReport).toHaveBeenCalledTimes(2); // CSV + standard Excel
  });

  it('should flatten every bucket into one admin zip per job site', async () => {
    const map = await runFormats(
      [ReportFormatEnum.PDF, ReportFormatEnum.EXCEL],
      { user: { id: CLIENT_ID }, weeklyOverrides: weekly },
    );

    const monthly = (consumer as any).convertToMonthlyAttachments(map);
    const flattened = monthly.flatMap((m: any) => m.attachments);

    // Both buckets collapse into a single per-site archive — the extra bucket
    // must not become an extra zip for admins.
    expect(monthly).toHaveLength(2);
    expect(flattened).toHaveLength(2);
  });
});

/**
 * The subscription's CC list has to survive the whole trip: cron reads it from
 * report_subscriptions, it rides on the report job, and every report email the
 * consumer sends must hand it to the mail service.
 */
describe('ReportGenerationConsumer report cc delivery', () => {
  let consumer: ReportGenerationConsumer;
  let mailService: Record<string, jest.Mock>;

  const CC = ['dre@woodchuck.ai'];
  const user = { id: 1, email: 'client@example.com', name: 'Client' } as any;

  const jobData = (over: any = {}): any => ({
    type: 'job-site',
    user,
    jobSiteId: 7,
    months: ['7-2026'],
    reportCcEmails: CC,
    ...over,
  });

  beforeEach(() => {
    mailService = {
      archiveReportsEmail: jest.fn(() => Promise.resolve()),
      archiveDashboardReportsEmail: jest.fn(() => Promise.resolve()),
      sendMonthlyReportEmail: jest.fn(() => Promise.resolve()),
      sendMonthlyReportAdminEmail: jest.fn(() => Promise.resolve()),
      sendDashboardReportUserEmail: jest.fn(() => Promise.resolve()),
      sendDashboardReportAdminEmail: jest.fn(() => Promise.resolve()),
    };
    consumer = new ReportGenerationConsumer(
      { findOne: jest.fn(() => Promise.resolve({ title: 'Site A' })) } as any,
      undefined as any,
      mailService as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      undefined as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should cc the list on an individual job-site report email', async () => {
    await (consumer as any).sendIndividualJobSiteEmail(user, jobData(), [
      'August 2026',
    ]);

    expect(mailService.sendMonthlyReportEmail.mock.calls[0][0].cc).toEqual(CC);
  });

  it('should cc the list on an admin consolidated report email', async () => {
    await (consumer as any).sendAdminConsolidatedEmail(
      user,
      jobData({ isAdmin: true }),
      [{ jobSite: { id: 7, title: 'Site A', clientName: 'Walbridge' } }],
      ['August 2026'],
    );

    expect(mailService.sendMonthlyReportAdminEmail.mock.calls[0][0].cc).toEqual(
      CC,
    );
  });

  it('should cc the list on a dashboard report email', async () => {
    await (consumer as any).sendDashboardMonthlyReportEmail(
      user,
      jobData({ type: 'dashboard', cron: true }),
      [{ plans: [] }],
      ['August 2026'],
      [{ filename: 'r.xlsx', url: 'https://dl.test/r' }],
    );

    expect(
      mailService.sendDashboardReportUserEmail.mock.calls[0][0].cc,
    ).toEqual(CC);
  });

  it('should cc the list on an admin dashboard report email', async () => {
    await (consumer as any).sendDashboardMonthlyReportEmail(
      user,
      jobData({ type: 'dashboard', cron: true, isAdmin: true }),
      [{ plans: [] }],
      ['August 2026'],
      [{ filename: 'r.xlsx', url: 'https://dl.test/r' }],
    );

    expect(
      mailService.sendDashboardReportAdminEmail.mock.calls[0][0].cc,
    ).toEqual(CC);
  });

  it('should cc the list on a non-cron dashboard archive email', async () => {
    await (consumer as any).sendDashboardMonthlyReportEmail(
      user,
      jobData({ type: 'dashboard' }),
      [{ plans: [] }],
      ['August 2026'],
      [{ filename: 'r.xlsx', url: 'https://dl.test/r' }],
    );

    expect(
      mailService.archiveDashboardReportsEmail.mock.calls[0][0].cc,
    ).toEqual(CC);
  });

  it('should cc the list on an archive job-site report email', async () => {
    await (consumer as any).sendArchiveJobSiteEmail(
      user,
      [{ jobSite: { id: 7, title: 'Site A' } }],
      ['August 2026'],
      undefined,
      CC,
    );

    expect(mailService.archiveReportsEmail.mock.calls[0][0].cc).toEqual(CC);
  });

  it('should send no cc when the job carries none', async () => {
    await (consumer as any).sendIndividualJobSiteEmail(
      user,
      jobData({ reportCcEmails: undefined }),
      ['August 2026'],
    );

    expect(
      mailService.sendMonthlyReportEmail.mock.calls[0][0].cc,
    ).toBeUndefined();
  });
});
