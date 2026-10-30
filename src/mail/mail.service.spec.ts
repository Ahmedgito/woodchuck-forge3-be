import { MailService } from './mail.service';

/**
 * Internal recipients on client-facing report emails.
 *
 * The CC list travels with the report job — it comes from the subscription's
 * reportCcEmails column, not from configuration. The BCC list
 * (INTERNAL_REPORT_BCC_EMAILS) remains config-driven and silent. Neither may
 * duplicate a subscriber who is already an explicit recipient, and the two
 * must not overlap — an address in both would be delivered twice.
 */
describe('MailService report recipients', () => {
  let service: MailService;
  let sendMail: jest.Mock;

  const buildService = (bcc: string[]) => {
    sendMail = jest.fn(() => Promise.resolve());
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'mail.internalReportBccEmails') return bcc;
        if (key === 'app.name') return 'Woodchuck';
        return undefined;
      }),
      getOrThrow: jest.fn(() => 'https://app.test'),
    };
    const i18nService = { t: jest.fn(() => Promise.resolve('text')) };
    return new MailService(
      { sendMail } as any,
      configService as any,
      i18nService as any,
    );
  };

  const ccOf = (cc?: string[], to?: string | string[]) =>
    (service as any).getReportCc(cc, to) as string[];
  const bccOf = (to?: string | string[], cc?: string[]) =>
    (service as any).getInternalReportBcc(to, cc) as string[];

  afterEach(() => jest.clearAllMocks());

  describe('getReportCc', () => {
    it('should return the cc list carried by the report', () => {
      service = buildService([]);

      expect(ccOf(['dre@woodchuck.ai'], 'client@example.com')).toEqual([
        'dre@woodchuck.ai',
      ]);
    });

    it('should return nothing when the subscription has no cc list', () => {
      service = buildService([]);

      expect(ccOf(undefined, 'client@example.com')).toEqual([]);
      expect(ccOf([], 'client@example.com')).toEqual([]);
    });

    it('should not cc someone who is already an explicit recipient', () => {
      service = buildService([]);

      expect(ccOf(['dre@woodchuck.ai'], 'DRE@woodchuck.ai')).toEqual([]);
    });

    it('should drop duplicates within the cc list itself', () => {
      service = buildService([]);

      expect(
        ccOf(['dre@woodchuck.ai', 'DRE@woodchuck.ai'], 'client@example.com'),
      ).toEqual(['dre@woodchuck.ai']);
    });

    it('should ignore blank entries', () => {
      service = buildService([]);

      expect(
        ccOf(['', '  ', 'dre@woodchuck.ai'], 'client@example.com'),
      ).toEqual(['dre@woodchuck.ai']);
    });
  });

  describe('getInternalReportBcc', () => {
    it('should keep bcc recipients that are not already cc', () => {
      service = buildService(['ops@woodchuck.ai']);

      expect(bccOf('client@example.com', ['dre@woodchuck.ai'])).toEqual([
        'ops@woodchuck.ai',
      ]);
    });

    it('should not bcc an address that is also being cc’d', () => {
      service = buildService(['dre@woodchuck.ai']);

      // Otherwise the same person receives the report twice.
      expect(bccOf('client@example.com', ['dre@woodchuck.ai'])).toEqual([]);
    });

    it('should not bcc someone who is already an explicit recipient', () => {
      service = buildService(['ops@woodchuck.ai']);

      expect(bccOf('ops@woodchuck.ai', [])).toEqual([]);
    });
  });

  describe('report emails', () => {
    const sentOptions = () => sendMail.mock.calls[0][0];

    it('should cc the subscription recipients on a job-site report email', async () => {
      service = buildService(['ops@woodchuck.ai']);

      await service.sendMonthlyReportEmail({
        to: 'client@example.com',
        cc: ['dre@woodchuck.ai'],
        data: {
          name: 'Client',
          jobSiteName: 'Site A',
          reportMonth: 'August 2026',
          downloadLinks: [],
        },
      } as any);

      expect(sentOptions().cc).toEqual(['dre@woodchuck.ai']);
      expect(sentOptions().bcc).toEqual(['ops@woodchuck.ai']);
    });

    it('should cc the subscription recipients on a dashboard report email', async () => {
      service = buildService([]);

      await service.sendDashboardReportUserEmail({
        to: 'client@example.com',
        cc: ['dre@woodchuck.ai'],
        data: {
          name: 'Client',
          reportMonths: ['August 2026'],
          downloadLinks: [],
        },
      } as any);

      expect(sentOptions().cc).toEqual(['dre@woodchuck.ai']);
    });

    it('should send no cc when the subscription carries none', async () => {
      service = buildService([]);

      await service.sendMonthlyReportAdminEmail({
        to: 'admin@example.com',
        data: { name: 'Admin', reportMonth: 'August 2026', downloadLinks: [] },
      } as any);

      expect(sentOptions().cc).toEqual([]);
    });
  });
});
