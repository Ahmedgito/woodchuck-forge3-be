import { ReportSubscriptionsService } from './report-subscriptions.service';
import { ReportTypeEnum } from './report-types.enum';
import { ReportFrequencyEnum } from './report-frequency.enum';
import { ReportFormatEnum } from './report-format.enum';

/**
 * The CC list is stored per subscription, so what lands in the column should
 * already match what the mailer would send — no blanks, no duplicates, no
 * stray whitespace.
 */
describe('ReportSubscriptionsService cc email normalization', () => {
  const service = new ReportSubscriptionsService(
    {} as any,
    {} as any,
    {} as any,
  );

  const normalize = (emails?: string[]) =>
    (service as any).normalizeCcEmails(emails) as string[];

  it('should keep a clean list unchanged', () => {
    expect(normalize(['dre@woodchuck.ai', 'sam@woodchuck.ai'])).toEqual([
      'dre@woodchuck.ai',
      'sam@woodchuck.ai',
    ]);
  });

  it('should trim surrounding whitespace', () => {
    expect(normalize(['  dre@woodchuck.ai  '])).toEqual(['dre@woodchuck.ai']);
  });

  it('should drop blank entries', () => {
    expect(normalize(['', '   ', 'dre@woodchuck.ai'])).toEqual([
      'dre@woodchuck.ai',
    ]);
  });

  it('should drop case-insensitive duplicates, keeping the first spelling', () => {
    expect(normalize(['Dre@Woodchuck.ai', 'dre@woodchuck.ai'])).toEqual([
      'Dre@Woodchuck.ai',
    ]);
  });

  it('should return an empty list for empty or missing input', () => {
    expect(normalize(undefined)).toEqual([]);
    expect(normalize([])).toEqual([]);
  });
});

describe('ReportSubscriptionsService both frequencies can stay active', () => {
  const monthly = {
    id: 26,
    isActive: true,
    frequency: ReportFrequencyEnum.MONTHLY,
    formats: [ReportFormatEnum.PDF],
    reportType: ReportTypeEnum.DASHBOARD,
  };
  const weekly = {
    id: 27,
    isActive: false,
    frequency: ReportFrequencyEnum.WEEKLY,
    formats: [ReportFormatEnum.PDF],
    reportType: ReportTypeEnum.DASHBOARD,
  };

  const createService = () => {
    const reportSubscriptionsRepository = {
      findOne: jest.fn(async ({ where }: { where: { frequency: string } }) => {
        if (where.frequency === ReportFrequencyEnum.WEEKLY) {
          return { ...weekly };
        }
        if (where.frequency === ReportFrequencyEnum.MONTHLY) {
          return { ...monthly };
        }
        return null;
      }),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => entity),
      find: jest.fn(),
    };
    const usersRepository = {
      findOne: jest.fn().mockResolvedValue({
        email: 'wahabahmed@folio3.com',
        name: 'Wahab',
      }),
    };
    const mailService = {
      sendReportSubscriptionEmail: jest.fn().mockResolvedValue(undefined),
      sendReportUnsubscriptionEmail: jest.fn().mockResolvedValue(undefined),
    };

    return {
      service: new ReportSubscriptionsService(
        reportSubscriptionsRepository as any,
        usersRepository as any,
        mailService as any,
      ),
      reportSubscriptionsRepository,
      mailService,
    };
  };

  it('does not deactivate monthly when weekly is turned on', async () => {
    const { service, reportSubscriptionsRepository } = createService();

    await service.toggleSubscription(
      {
        reportType: ReportTypeEnum.DASHBOARD,
        frequency: ReportFrequencyEnum.WEEKLY,
        isActive: true,
        formats: [ReportFormatEnum.PDF],
      },
      15,
    );

    expect(reportSubscriptionsRepository.save).toHaveBeenCalledTimes(1);
    expect(reportSubscriptionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: ReportFrequencyEnum.WEEKLY,
        isActive: true,
      }),
    );
    expect(reportSubscriptionsRepository.save).not.toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: ReportFrequencyEnum.MONTHLY,
        isActive: false,
      }),
    );
  });

  it('returns monthly and weekly as independently active', async () => {
    const { service, reportSubscriptionsRepository } = createService();
    reportSubscriptionsRepository.find.mockResolvedValue([
      { ...monthly, isActive: true, jobSite: null },
      { ...weekly, isActive: true, jobSite: null },
    ]);

    const result = await service.findByUser(15);

    expect(result.dashboard).toEqual({
      monthly: true,
      weekly: true,
      formats: [ReportFormatEnum.PDF],
    });
  });
});
