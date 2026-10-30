import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { ClientExcelReportService } from './client-excel-report.service';

/**
 * Unit tests for the client-format Excel workbook shared by the monthly
 * (cumulative) and weekly report flows. Both frequencies must emit the exact
 * same sheet structure — only the period bucketing and the filename differ.
 *
 * The dumpster repository stub honours the `Between(...)` operator the service
 * builds, so "only this week's data" is asserted against the real date bounds
 * the service asks the database for.
 */
describe('ClientExcelReportService', () => {
  let tmpDir: string;
  let service: ClientExcelReportService;
  let dumpsterFind: jest.Mock;

  const CLIENT_ID = 42;

  // Previous week: Mon 2026-08-17 → Sun 2026-08-23.
  const WEEK_START = new Date(2026, 7, 17, 0, 0, 0, 0);
  const WEEK_END = new Date(2026, 7, 23, 23, 59, 59, 999);

  const makeDumpster = (
    isoDate: string,
    wasteStreamName: string,
    realWeight: number | null,
    estimatedWeight: number | null = null,
    jobSiteId = 1,
  ) => ({
    creationDate: new Date(isoDate),
    real_weight: realWeight,
    estimated_weight: estimatedWeight,
    jobSiteWastestreams: {
      jobSite: { id: jobSiteId },
      wasteStream: { name: wasteStreamName },
    },
  });

  /**
   * Builds the service with stub repositories. `jobSites` become the client's
   * sites (one tab each); `dumpsters` are filtered by the stub using the
   * `Between` bounds the service passes, mimicking the database.
   */
  const buildService = (jobSites: any[], dumpsters: any[]) => {
    dumpsterFind = jest.fn((options: any) => {
      const between = options?.where?.creationDate;
      const [from, to] = (between?.value ?? []) as Date[];
      const siteId = options?.where?.jobSiteWastestreams?.jobSite?.id;
      return Promise.resolve(
        dumpsters.filter((d) => {
          if (siteId && d.jobSiteWastestreams.jobSite.id !== siteId)
            return false;
          if (!from || !to) return true;
          return d.creationDate >= from && d.creationDate <= to;
        }),
      );
    });

    return new ClientExcelReportService(
      { find: jest.fn(() => Promise.resolve(jobSites)) } as any,
      { find: jest.fn(() => Promise.resolve([])) } as any,
      { find: dumpsterFind } as any,
      { getActivity: jest.fn(() => Promise.resolve('Biomass')) } as any,
    );
  };

  const site = (id: number, title: string, startDate: string) => ({
    id,
    title,
    startDate: new Date(startDate),
    createdAt: new Date(startDate),
    client: { id: CLIENT_ID, name: 'Walbridge' },
  });

  /** Reads a generated workbook back as `{ sheetName: rows }`. */
  const readWorkbook = async (filePath: string) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheets: Record<string, any[][]> = {};
    workbook.eachSheet((sheet) => {
      const rows: any[][] = [];
      sheet.eachRow((row) => {
        rows.push((row.values as any[]).slice(1));
      });
      sheets[sheet.name] = rows;
    });
    return sheets;
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'client-excel-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('generateWeeklyExcel', () => {
    it('should emit one row per waste stream spanning Monday to Sunday', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-01-15')],
        [
          makeDumpster('2026-08-18T10:00:00', 'WOOD WASTE', 3),
          makeDumpster('2026-08-20T10:00:00', 'WOOD WASTE', 1.2),
          makeDumpster('2026-08-21T10:00:00', 'METAL', 1.1),
        ],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      expect(sheets['Site A'].slice(1)).toEqual([
        [
          'WOOD WASTE',
          '2026-08-17',
          '2026-08-23',
          4.2,
          'Tonnage',
          'Woodchuck',
          'Biomass',
        ],
        [
          'METAL',
          '2026-08-17',
          '2026-08-23',
          1.1,
          'Tonnage',
          'Woodchuck',
          'Biomass',
        ],
      ]);
    });

    it('should exclude activity outside the Monday-to-Sunday window', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-01-15')],
        [
          makeDumpster('2026-08-16T23:00:00', 'WOOD WASTE', 99), // Sunday before
          makeDumpster('2026-08-19T10:00:00', 'WOOD WASTE', 2),
          makeDumpster('2026-08-24T01:00:00', 'WOOD WASTE', 77), // Monday after
        ],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      const quantities = sheets['Site A'].slice(1).map((row) => row[3]);
      expect(quantities).toEqual([2]);
    });

    it('should report only the week, ignoring history since the job site started', async () => {
      service = buildService(
        [site(1, 'Site A', '2025-03-01')],
        [
          makeDumpster('2025-06-10T10:00:00', 'WOOD WASTE', 500),
          makeDumpster('2026-08-19T10:00:00', 'WOOD WASTE', 2),
        ],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      expect(sheets['Site A'].slice(1)).toEqual([
        [
          'WOOD WASTE',
          '2026-08-17',
          '2026-08-23',
          2,
          'Tonnage',
          'Woodchuck',
          'Biomass',
        ],
      ]);
    });

    it('should drop waste streams with no tonnage in the week', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-01-15')],
        [
          makeDumpster('2026-08-19T10:00:00', 'WOOD WASTE', 2),
          makeDumpster('2026-08-19T11:00:00', 'PLASTIC', 0),
        ],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      const descriptions = sheets['Site A'].slice(1).map((row) => row[0]);
      expect(descriptions).toEqual(['WOOD WASTE']);
    });

    it('should fall back to estimated weight when real weight is absent', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-01-15')],
        [makeDumpster('2026-08-19T10:00:00', 'METAL', null, 2.5)],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      expect(sheets['Site A'][1][3]).toBe(2.5);
    });

    it('should keep a header-only tab for a job site with no activity that week', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-01-15'), site(2, 'Site B', '2026-01-15')],
        [makeDumpster('2026-08-19T10:00:00', 'WOOD WASTE', 2, null, 1)],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      expect(Object.keys(sheets)).toEqual(['Site A', 'Site B']);
      expect(sheets['Site B']).toHaveLength(1);
    });

    it('should restrict the workbook to one tab when a job site is given', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-01-15'), site(2, 'Site B', '2026-01-15')],
        [makeDumpster('2026-08-19T10:00:00', 'WOOD WASTE', 2, null, 2)],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
        2,
      );
      const sheets = await readWorkbook(result.path);

      expect(Object.keys(sheets)).toEqual(['Site B']);
    });

    it('should drop rows the query returns outside the week', async () => {
      // The query's lower bound is parsed as UTC midnight while its upper bound
      // is local, so a row just before local Monday can come back from the
      // database. The in-memory period filter must still exclude it.
      const leaky = [
        makeDumpster('2026-08-16T19:00:00', 'WOOD WASTE', 99), // Sunday evening
        makeDumpster('2026-08-19T10:00:00', 'WOOD WASTE', 2),
        makeDumpster('2026-08-24T00:30:00', 'WOOD WASTE', 88), // next Monday
      ];
      service = new ClientExcelReportService(
        {
          find: jest.fn(() =>
            Promise.resolve([site(1, 'Site A', '2026-01-15')]),
          ),
        } as any,
        { find: jest.fn(() => Promise.resolve([])) } as any,
        // Ignores the Between bounds entirely — returns everything.
        { find: jest.fn(() => Promise.resolve(leaky)) } as any,
        { getActivity: jest.fn(() => Promise.resolve('Biomass')) } as any,
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      expect(sheets['Site A'].slice(1).map((row) => row[3])).toEqual([2]);
    });

    it('should name the file for the week without the word cumulative', async () => {
      service = buildService([site(1, 'Site A', '2026-01-15')], []);

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );

      expect(result.filename).toBe(
        'weekly_report_Walbridge_2026-08-17_2026-08-23.xlsx',
      );
      expect(result.filename.toLowerCase()).not.toContain('cumulative');
    });

    it('should keep job-site workbooks of the same client distinct on disk', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-01-15'), site(2, 'Site B', '2026-01-15')],
        [],
      );

      const result = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
        2,
      );

      expect(result.filename).toBe(
        'weekly_report_Walbridge_jobsite_2_2026-08-17_2026-08-23.xlsx',
      );
    });
  });

  describe('generateCumulativeExcel', () => {
    it('should still bucket data by calendar month across the job site history', async () => {
      service = buildService(
        [site(1, 'Site A', '2026-06-10')],
        [
          makeDumpster('2026-06-15T10:00:00', 'WOOD WASTE', 3),
          makeDumpster('2026-07-02T10:00:00', 'WOOD WASTE', 5),
        ],
      );

      const result = await service.generateCumulativeExcel(
        CLIENT_ID,
        new Date(2026, 6, 31, 23, 59, 59),
        tmpDir,
      );
      const sheets = await readWorkbook(result.path);

      expect(sheets['Site A'].slice(1)).toEqual([
        [
          'WOOD WASTE',
          '2026-06-01',
          '2026-06-30',
          3,
          'Tonnage',
          'Woodchuck',
          'Biomass',
        ],
        [
          'WOOD WASTE',
          '2026-07-01',
          '2026-07-31',
          5,
          'Tonnage',
          'Woodchuck',
          'Biomass',
        ],
      ]);
    });

    it('should keep the cumulative workbook creator metadata', async () => {
      service = buildService([site(1, 'Site A', '2026-06-10')], []);

      const result = await service.generateCumulativeExcel(
        CLIENT_ID,
        new Date(2026, 6, 31),
        tmpDir,
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(result.path);
      expect(workbook.creator).toBe('Woodchuck Cumulative Report');
    });

    it('should keep the cumulative filename', async () => {
      service = buildService([site(1, 'Site A', '2026-06-10')], []);

      const result = await service.generateCumulativeExcel(
        CLIENT_ID,
        new Date(2026, 6, 31),
        tmpDir,
      );

      expect(result.filename).toMatch(
        /^cumulative_report_Walbridge_\d{4}-\d{2}-\d{2}\.xlsx$/,
      );
    });
  });

  describe('workbook structure parity', () => {
    it('should use the same headers for weekly and monthly workbooks', async () => {
      const expectedHeaders = [
        'Description',
        'Start Date',
        'End Date',
        'Quantity',
        'Unit',
        'Supplier',
        'Activity',
      ];

      service = buildService([site(1, 'Site A', '2026-06-10')], []);
      const weekly = await service.generateWeeklyExcel(
        CLIENT_ID,
        WEEK_START,
        WEEK_END,
        tmpDir,
      );
      const monthly = await service.generateCumulativeExcel(
        CLIENT_ID,
        new Date(2026, 6, 31),
        tmpDir,
      );

      expect((await readWorkbook(weekly.path))['Site A'][0]).toEqual(
        expectedHeaders,
      );
      expect((await readWorkbook(monthly.path))['Site A'][0]).toEqual(
        expectedHeaders,
      );
    });
  });
});
