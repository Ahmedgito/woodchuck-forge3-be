import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ReportSubscriptionsService } from 'src/report-subscriptions/report-subscriptions.service';
import { HomeService } from 'src/home/home.service';
import { RoleEnum } from 'src/roles/roles.enum';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { QueuesService } from 'src/queues/queues.service';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import { ReportTypeEnum } from 'src/report-subscriptions/report-types.enum';
import { CompressionExtensionEnum } from 'src/report-subscriptions/compression-extension.enum';
import { getLastWeekDateRange } from 'src/utils/get-last-week-range.util';
import { CRON_EXPRESSIONS } from '../constants/cron.constants';
import { MailService } from 'src/mail/mail.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { ClientReportConfigService } from 'src/client-report-config/client-report-config.service';
import { ClientExcelReportService } from 'src/report-export/client-excel-report.service';
import { ReportLoggerService } from 'src/report-logger/report-logger.service';
import { endOfMonth, subMonths } from 'date-fns';

interface WeeklyOverrides {
  weekly?: boolean;
  startDate?: string;
  endDate?: string;
}

interface MonthlyReportTriggerOptions {
  emails?: string[];
}

interface SubscriptionGroup {
  user: any;
  subscriptions: any[];
}

interface UserDisplayInfo {
  name: string;
  displayName: string;
}

interface FrequencyReport {
  monthly: {
    wcAdmins: UserDisplayInfo[];
    clientAdmins: UserDisplayInfo[];
  };
  weekly: {
    wcAdmins: UserDisplayInfo[];
    clientAdmins: UserDisplayInfo[];
  };
}

interface JobSiteReport {
  jobSiteId: number;
  jobSiteName: string;
  monthly: {
    wcAdmins: UserDisplayInfo[];
    clientAdmins: UserDisplayInfo[];
  };
  weekly: {
    wcAdmins: UserDisplayInfo[];
    clientAdmins: UserDisplayInfo[];
  };
}

interface ClientGroup {
  clientId: number;
  clientName: string;
  roleName: string;
  jobSites: JobSiteReport[];
}

interface ReportOverview {
  dashboard: FrequencyReport;
  jobSites: ClientGroup[];
}

@Injectable()
export class ReportEmailJobService {
  constructor(
    private readonly reportSubscriptionsService: ReportSubscriptionsService,
    private readonly homeService: HomeService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly queuesService: QueuesService,
    private readonly mailService: MailService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly clientReportConfigService: ClientReportConfigService,
    private readonly clientExcelReportService: ClientExcelReportService,
    private readonly reportLogger: ReportLoggerService,
  ) {
    this.registerCronJob();
  }

  private registerCronJob() {
    const timezone = this.configService.get<string>('camera.timezone', {
      infer: true,
    });

    const createCronJob = (cronTime: string, onTick: () => Promise<void>) =>
      new CronJob(cronTime, onTick, null, true, timezone);

    // Check APP_ENV to determine cron schedule
    const appEnv =
      this.configService.get<string>('APP_ENV', { infer: true }) ||
      process.env.APP_ENV;
    const monthlyCronExpression =
      appEnv === 'QA'
        ? CRON_EXPRESSIONS.EVERY_30_MINUTES
        : CRON_EXPRESSIONS.EVERY_1ST_DAY_OF_MONTH_AT_08_00;

    const monthlyJob = createCronJob(monthlyCronExpression, async () => {
      await this.handleMonthlyReportEmails();
    });

    const weeklyJob = createCronJob(
      CRON_EXPRESSIONS.EVERY_MONDAY_AT_08_00,
      // CRON_EXPRESSIONS.TEST_CRON_EXPRESSION,
      async () => {
        await this.handleWeeklyReportEmails();
      },
    );

    const overviewJob = createCronJob(
      CRON_EXPRESSIONS.EVERY_FRIDAY_AT_08_00,
      async () => {
        await this.handleReportOverviewEmail();
      },
    );

    this.schedulerRegistry.addCronJob('reports-monthly-job', monthlyJob as any);
    this.schedulerRegistry.addCronJob('reports-weekly-job', weeklyJob as any);
    this.schedulerRegistry.addCronJob(
      'reports-overview-job',
      overviewJob as any,
    );
  }

  async handleMonthlyReportEmails(options: MonthlyReportTriggerOptions = {}) {
    const startedAt = Date.now();
    const emailFilter = this.normalizeEmailFilter(options.emails);
    try {
      console.log('Starting monthly report email job');
      void this.reportLogger.log('Starting monthly report email job', 'ReportEmailJobService', {
        emailFilter: emailFilter ? Array.from(emailFilter) : undefined,
      });

      const allSubscriptions =
        await this.reportSubscriptionsService.getActiveMonthlySubscriptions();

      const subscriptions = emailFilter
        ? allSubscriptions.filter((sub) => {
            const email = sub.user?.email?.toLowerCase();
            return !!email && emailFilter.has(email);
          })
        : allSubscriptions;

      if (emailFilter) {
        const matchedEmails = new Set(
          subscriptions
            .map((s) => s.user?.email?.toLowerCase())
            .filter((e): e is string => !!e),
        );
        const unmatchedEmails = Array.from(emailFilter).filter(
          (e) => !matchedEmails.has(e),
        );
        if (unmatchedEmails.length > 0) {
          void this.reportLogger.warn(
            `No active monthly subscriptions found for ${unmatchedEmails.length} requested email(s)`,
            'ReportEmailJobService',
            { frequency: 'monthly', unmatchedEmails },
          );
        }
      }

      const { jobSiteSubscriptions, dashboardSubscriptions, filteredOutJobSites } =
        this.separateSubscriptionsByType(subscriptions);

      const monthString = this.calculateLastMonthString();

      console.log(
        `Monthly subscriptions — total: ${subscriptions.length} | job-site eligible: ${jobSiteSubscriptions.length} | dashboard: ${dashboardSubscriptions.length} | filtered out: ${filteredOutJobSites.length} | month: ${monthString}`,
      );
      void this.reportLogger.log(
        `Subscriptions fetched — total: ${subscriptions.length} | job-site eligible: ${jobSiteSubscriptions.length} | dashboard: ${dashboardSubscriptions.length} | filtered: ${filteredOutJobSites.length}`,
        'ReportEmailJobService',
        {
          frequency: 'monthly',
          monthString,
          totalSubscriptions: subscriptions.length,
          jobSiteEligible: jobSiteSubscriptions.length,
          dashboardSubscriptions: dashboardSubscriptions.length,
          filteredOutCount: filteredOutJobSites.length,
        },
      );

      if (filteredOutJobSites.length > 0) {
        void this.reportLogger.warn(
          `${filteredOutJobSites.length} job-site subscription(s) were filtered out (created in current month or invalid)`,
          'ReportEmailJobService',
          { frequency: 'monthly', filteredOutJobSites },
        );
      }

      const jobSiteQueued = await this.processJobSiteReports(jobSiteSubscriptions, monthString);
      const dashboardQueued = await this.processDashboardReports(dashboardSubscriptions, monthString);

      const durationMs = Date.now() - startedAt;
      const summary = `Monthly report email job completed — queued ${jobSiteQueued + dashboardQueued} report(s) (${jobSiteQueued} job-site, ${dashboardQueued} dashboard) in ${durationMs}ms`;
      console.log(summary);
      void this.reportLogger.log(summary, 'ReportEmailJobService', {
        frequency: 'monthly',
        monthString,
        jobSiteQueued,
        dashboardQueued,
        totalQueued: jobSiteQueued + dashboardQueued,
        durationMs,
      });
    } catch (error) {
      console.error('Error occurred while processing monthly report emails:', error);
      void this.reportLogger.error(
        `Monthly report email job failed: ${error?.message}`,
        'ReportEmailJobService',
        { frequency: 'monthly', error: error?.message, durationMs: Date.now() - startedAt },
      );
      await this.homeService.closePuppeteerBrowser();
    }
  }

  async handleWeeklyReportEmails() {
    const startedAt = Date.now();
    try {
      console.log('Starting weekly report email job');
      void this.reportLogger.log('Starting weekly report email job', 'ReportEmailJobService');

      const subscriptions =
        await this.reportSubscriptionsService.getActiveWeeklySubscriptions();

      const { jobSiteSubscriptions, dashboardSubscriptions, filteredOutJobSites } =
        this.separateSubscriptionsByType(subscriptions);

      const { weekString, startDate, endDate } = getLastWeekDateRange();
      const weeklyOverrides: WeeklyOverrides = {
        weekly: true,
        startDate,
        endDate,
      };

      console.log(
        `Weekly subscriptions — total: ${subscriptions.length} | job-site eligible: ${jobSiteSubscriptions.length} | dashboard: ${dashboardSubscriptions.length} | filtered out: ${filteredOutJobSites.length} | week: ${startDate} to ${endDate}`,
      );
      void this.reportLogger.log(
        `Subscriptions fetched — total: ${subscriptions.length} | job-site eligible: ${jobSiteSubscriptions.length} | dashboard: ${dashboardSubscriptions.length} | filtered: ${filteredOutJobSites.length}`,
        'ReportEmailJobService',
        {
          frequency: 'weekly',
          weekString,
          startDate,
          endDate,
          totalSubscriptions: subscriptions.length,
          jobSiteEligible: jobSiteSubscriptions.length,
          dashboardSubscriptions: dashboardSubscriptions.length,
          filteredOutCount: filteredOutJobSites.length,
        },
      );

      if (filteredOutJobSites.length > 0) {
        void this.reportLogger.warn(
          `${filteredOutJobSites.length} job-site subscription(s) were filtered out (created in current month or invalid)`,
          'ReportEmailJobService',
          { frequency: 'weekly', filteredOutJobSites },
        );
      }

      const jobSiteQueued = await this.processJobSiteReports(
        jobSiteSubscriptions,
        weekString,
        weeklyOverrides,
      );
      const dashboardQueued = await this.processDashboardReports(
        dashboardSubscriptions,
        weekString,
        weeklyOverrides,
      );

      const durationMs = Date.now() - startedAt;
      const summary = `Weekly report email job completed — queued ${jobSiteQueued + dashboardQueued} report(s) (${jobSiteQueued} job-site, ${dashboardQueued} dashboard) in ${durationMs}ms`;
      console.log(summary);
      void this.reportLogger.log(summary, 'ReportEmailJobService', {
        frequency: 'weekly',
        weekString,
        startDate,
        endDate,
        jobSiteQueued,
        dashboardQueued,
        totalQueued: jobSiteQueued + dashboardQueued,
        durationMs,
      });
    } catch (error) {
      console.error('Error occurred while processing weekly report emails:', error);
      void this.reportLogger.error(
        `Weekly report email job failed: ${error?.message}`,
        'ReportEmailJobService',
        { frequency: 'weekly', error: error?.message, durationMs: Date.now() - startedAt },
      );
      await this.homeService.closePuppeteerBrowser();
    }
  }

  private async processJobSiteReports(
    jobSiteSubscriptions: any[],
    monthString: string,
    weeklyOverrides?: WeeklyOverrides,
  ): Promise<number> {
    const subscriptionsByUser =
      this.groupSubscriptionsByUser(jobSiteSubscriptions);
    let queuedCount = 0;

    for (const [userId, { user, subscriptions }] of subscriptionsByUser) {
      try {
        const isAdmin =
          user?.role?.id === RoleEnum.admin || user?.role?.id === RoleEnum.cms;
        await this.queueJobSiteReportsForUser(
          user,
          subscriptions,
          monthString,
          weeklyOverrides,
        );
        queuedCount += isAdmin && subscriptions.length > 1 ? 1 : subscriptions.length;
      } catch (error) {
        console.error(
          `Failed to queue report generation for user ${userId}:`,
          error,
        );
        void this.reportLogger.error(
          `Failed to queue job-site report(s) for user ${user?.email || userId}: ${error?.message}`,
          'ReportEmailJobService',
          {
            email: user?.email,
            userId,
            subscriptionCount: subscriptions.length,
            jobSiteIds: subscriptions.map((s) => s.jobSite?.id).filter(Boolean),
            monthString,
            weekly: !!weeklyOverrides?.weekly,
            error: error?.message,
          },
        );
      }
    }

    return queuedCount;
  }

  private groupSubscriptionsByUser(
    subscriptions: any[],
  ): Map<number, SubscriptionGroup> {
    const subscriptionsByUser = new Map<number, SubscriptionGroup>();

    for (const sub of subscriptions) {
      const userId = sub.user?.id;
      if (!userId) continue;

      if (!subscriptionsByUser.has(userId)) {
        subscriptionsByUser.set(userId, {
          user: sub.user,
          subscriptions: [],
        });
      }
      subscriptionsByUser.get(userId)!.subscriptions.push(sub);
    }

    return subscriptionsByUser;
  }

  private async queueJobSiteReportsForUser(
    user: any,
    subscriptions: any[],
    monthString: string,
    weeklyOverrides?: WeeklyOverrides,
  ) {
    const isAdmin =
      user?.role?.id === RoleEnum.admin || user?.role?.id === RoleEnum.cms;

    if (isAdmin && subscriptions.length > 1) {
      await this.queueConsolidatedAdminJobSiteReport(
        user,
        subscriptions,
        monthString,
        weeklyOverrides,
      );
    } else {
      await this.queueIndividualJobSiteReports(
        subscriptions,
        monthString,
        weeklyOverrides,
        isAdmin,
      );
    }
  }

  private async queueConsolidatedAdminJobSiteReport(
    user: any,
    subscriptions: any[],
    monthString: string,
    weeklyOverrides?: WeeklyOverrides,
  ) {
    const jobSiteIds = subscriptions.map((sub) => sub.jobSite.id);
    const jobSiteFormatsMap: Record<number, ReportFormatEnum[]> = {};

    subscriptions.forEach((sub) => {
      jobSiteFormatsMap[sub.jobSite.id] = sub.formats || [ReportFormatEnum.PDF];
    });

    // All reports deliver as download links. If any subscriber opted into PIZ,
    // use PIZ for the consolidated email so those recipients also get a .piz
    // link alongside the .zip link for each site archive.
    const consolidatedExtension =
      subscriptions.find(
        (s) => s.compressionExtension === CompressionExtensionEnum.PIZ,
      )?.compressionExtension ?? subscriptions[0]?.compressionExtension;

    await this.queuesService.generateReport({
      type: 'job-site',
      user,
      jobSiteIds,
      jobSiteFormatsMap,
      months: [monthString],
      weeklyOverrides,
      isAdmin: true,
      useJobSiteNameInFilename: true,
      cron: true,
      compressionExtension: consolidatedExtension,
      reportCcEmails: this.mergeReportCcEmails(subscriptions),
    });

    console.log(
      `Queued consolidated report generation for ${jobSiteIds.length} job sites for admin user ${user.email}`,
    );
    void this.reportLogger.log(
      `Queued consolidated job-site report for ${jobSiteIds.length} job site(s) — user: ${user.email}`,
      'ReportEmailJobService',
      { email: user.email, jobSiteIds, monthString, weekly: !!weeklyOverrides?.weekly },
    );
  }

  private async queueIndividualJobSiteReports(
    subscriptions: any[],
    monthString: string,
    weeklyOverrides?: WeeklyOverrides,
    isAdmin = false,
  ) {
    for (const sub of subscriptions) {
      await this.queuesService.generateReport({
        type: 'job-site',
        user: sub.user,
        jobSiteId: sub.jobSite.id,
        months: [monthString],
        formats: sub.formats || [ReportFormatEnum.PDF],
        weeklyOverrides,
        isAdmin,
        useJobSiteNameInFilename: false,
        cron: true,
        compressionExtension: sub.compressionExtension,
        reportCcEmails: this.mergeReportCcEmails([sub]),
      });

      console.log(
        `Queued report generation for job site ${sub.jobSite.id} for user ${sub.user.email}`,
      );
      void this.reportLogger.log(
        `Queued job-site report for job site ${sub.jobSite.id} — user: ${sub.user.email}`,
        'ReportEmailJobService',
        { email: sub.user.email, jobSiteId: sub.jobSite.id, formats: sub.formats, monthString, weekly: !!weeklyOverrides?.weekly },
      );
    }
  }

  private async processDashboardReports(
    dashboardSubscriptions: any[],
    monthString: string,
    weeklyOverrides?: WeeklyOverrides,
  ): Promise<number> {
    if (dashboardSubscriptions.length === 0) {
      console.log('No dashboard subscriptions found');
      void this.reportLogger.warn(
        'No dashboard subscriptions found',
        'ReportEmailJobService',
        { monthString, weekly: !!weeklyOverrides?.weekly },
      );
      return 0;
    }

    let queuedCount = 0;
    for (const sub of dashboardSubscriptions) {
      try {
        await this.queueDashboardReport(sub, monthString, weeklyOverrides);
        queuedCount++;
      } catch (error) {
        console.error(
          `Failed to queue dashboard report generation for subscription:`,
          error,
        );
        void this.reportLogger.error(
          `Failed to queue dashboard report for user ${sub.user?.email || sub.user?.id}: ${error?.message}`,
          'ReportEmailJobService',
          {
            email: sub.user?.email,
            userId: sub.user?.id,
            formats: sub.formats,
            monthString,
            weekly: !!weeklyOverrides?.weekly,
            error: error?.message,
          },
        );
      }
    }

    return queuedCount;
  }

  private async queueDashboardReport(
    subscription: any,
    monthString: string,
    weeklyOverrides?: WeeklyOverrides,
  ) {
    const isAdmin =
      subscription.user?.role?.id === RoleEnum.admin ||
      subscription.user?.role?.id === RoleEnum.cms;

    await this.queuesService.generateReport({
      type: 'dashboard',
      user: subscription.user,
      months: [monthString],
      formats: subscription.formats || [ReportFormatEnum.PDF],
      weeklyOverrides,
      isAdmin,
      cron: true,
      compressionExtension: subscription.compressionExtension,
      reportCcEmails: this.mergeReportCcEmails([subscription]),
    });

    console.log(
      `Queued dashboard report generation for user ${subscription.user.email}`,
    );
    void this.reportLogger.log(
      `Queued dashboard report — user: ${subscription.user.email}`,
      'ReportEmailJobService',
      { email: subscription.user.email, formats: subscription.formats, monthString, weekly: !!weeklyOverrides?.weekly },
    );
  }

  private separateSubscriptionsByType(subscriptions: any[]) {
    const jobSiteSubscriptions: any[] = [];
    const filteredOutJobSites: Array<{
      jobSiteId: number;
      jobSiteName: string;
      userEmail: string;
      reason: string;
    }> = [];

    for (const sub of subscriptions) {
      if (sub.reportType !== ReportTypeEnum.JOB_SITE) continue;
      if (!sub.jobSite?.id) {
        filteredOutJobSites.push({
          jobSiteId: 0,
          jobSiteName: 'unknown',
          userEmail: sub.user?.email,
          reason: 'missing-jobSite-id',
        });
        continue;
      }
      if (this.isJobSiteEligibleForReport(sub.jobSite)) {
        jobSiteSubscriptions.push(sub);
      } else {
        filteredOutJobSites.push({
          jobSiteId: sub.jobSite.id,
          jobSiteName: sub.jobSite.title || `Job Site ${sub.jobSite.id}`,
          userEmail: sub.user?.email,
          reason: 'created-in-current-month',
        });
      }
    }

    const dashboardSubscriptions = subscriptions.filter(
      (sub) => sub.reportType === ReportTypeEnum.DASHBOARD,
    );

    return { jobSiteSubscriptions, dashboardSubscriptions, filteredOutJobSites };
  }

  private isJobSiteEligibleForReport(jobSite: any): boolean {
    const now = new Date();
    let startDate: Date | null = null;

    if (jobSite.startDate) {
      startDate = new Date(jobSite.startDate);
    } else if (jobSite.createdAt) {
      startDate = new Date(jobSite.createdAt);
    }

    if (!startDate) return false;

    // Exclude job sites created in the current month
    return !(
      startDate.getMonth() === now.getMonth() &&
      startDate.getFullYear() === now.getFullYear()
    );
  }

  /**
   * Merges the CC lists of the subscriptions that share one email, dropping
   * blanks and case-insensitive duplicates. An admin's consolidated multi-site
   * report is a single email covering several subscriptions, so their lists
   * combine; every other report has exactly one subscription.
   */
  private mergeReportCcEmails(subscriptions: any[]): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const sub of subscriptions) {
      for (const raw of sub?.reportCcEmails ?? []) {
        const email = typeof raw === 'string' ? raw.trim() : '';
        if (!email) continue;
        const normalized = email.toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        merged.push(email);
      }
    }

    return merged;
  }

  private normalizeEmailFilter(emails?: string[]): Set<string> | null {
    if (!emails || emails.length === 0) return null;
    const normalized = emails
      .map((e) => e?.trim().toLowerCase())
      .filter((e): e is string => !!e);
    return normalized.length > 0 ? new Set(normalized) : null;
  }

  private calculateLastMonthString(): string {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthIndex = lastMonth.getMonth();
    const year = lastMonth.getFullYear();
    return `${monthIndex}-${year}`;
  }

  async handleReportOverviewEmail() {
    try {
      console.log('Starting report overview email job...');
      void this.reportLogger.log('Starting report overview email job', 'ReportEmailJobService');

      // Get all Super Admins (admin + CMS)
      const superAdmins = await this.usersRepository.find({
        where: [
          { role: { id: RoleEnum.admin }, status: { id: StatusEnum.active } },
          { role: { id: RoleEnum.cms }, status: { id: StatusEnum.active } },
        ],
        relations: ['role', 'status'],
      });

      if (superAdmins.length === 0) {
        console.log('No Super Admins found. Skipping report overview email.');
        void this.reportLogger.warn('No Super Admins found. Skipping report overview email.', 'ReportEmailJobService');
        return;
      }

      // Get all active subscriptions (both monthly and weekly)
      const monthlySubscriptions =
        await this.reportSubscriptionsService.getActiveMonthlySubscriptions();
      const weeklySubscriptions =
        await this.reportSubscriptionsService.getActiveWeeklySubscriptions();

      // Separate dashboard and job site subscriptions
      const monthlyDashboardSubs = monthlySubscriptions.filter(
        (sub) => sub.reportType === ReportTypeEnum.DASHBOARD,
      );
      const weeklyDashboardSubs = weeklySubscriptions.filter(
        (sub) => sub.reportType === ReportTypeEnum.DASHBOARD,
      );

      const monthlyJobSiteSubs = monthlySubscriptions.filter(
        (sub) =>
          sub.reportType === ReportTypeEnum.JOB_SITE && sub.jobSite !== null,
      );
      const weeklyJobSiteSubs = weeklySubscriptions.filter(
        (sub) =>
          sub.reportType === ReportTypeEnum.JOB_SITE && sub.jobSite !== null,
      );

      // Group by report type and frequency
      const reportOverview: ReportOverview = {
        dashboard: this.groupSubscriptionsByFrequency(
          monthlyDashboardSubs,
          weeklyDashboardSubs,
        ),
        jobSites: this.groupJobSiteSubscriptions(
          monthlyJobSiteSubs,
          weeklyJobSiteSubs,
        ),
      };
      // Send email to all Super Admins
      for (const admin of superAdmins) {
        if (admin.email) {
          await this.mailService.sendReportOverviewEmail({
            to: admin.email,
            data: {
              adminName: admin.name || admin.username || 'Super Admin',
              reportOverview,
            },
          });
          console.log(`Overview email sent to ${admin.email}`);
          void this.reportLogger.log(
            `Overview email sent to ${admin.email}`,
            'ReportEmailJobService',
            { email: admin.email, adminName: admin.name || admin.username },
          );
        }
      }

      console.log('Report overview email job completed');
      void this.reportLogger.log('Report overview email job completed', 'ReportEmailJobService');
    } catch (error) {
      console.error('Error occurred while processing report overview email:', error);
      void this.reportLogger.error(
        `Report overview email job failed: ${error?.message}`,
        'ReportEmailJobService',
        { error: error?.message },
      );
    }
  }

  private groupSubscriptionsByFrequency(
    monthlySubs: any[],
    weeklySubs: any[],
  ): FrequencyReport {
    const reportOverview: FrequencyReport = {
      monthly: { wcAdmins: [], clientAdmins: [] },
      weekly: { wcAdmins: [], clientAdmins: [] },
    };

    // Track unique users by their ID to avoid duplicates
    const monthlyWcAdminIds = new Set<number>();
    const monthlyClientAdminIds = new Set<number>();
    const weeklyWcAdminIds = new Set<number>();
    const weeklyClientAdminIds = new Set<number>();

    // Process monthly subscriptions
    for (const sub of monthlySubs) {
      this.addUserToFrequencyReport(
        reportOverview.monthly,
        sub.user,
        monthlyWcAdminIds,
        monthlyClientAdminIds,
      );
    }

    // Process weekly subscriptions
    for (const sub of weeklySubs) {
      this.addUserToFrequencyReport(
        reportOverview.weekly,
        sub.user,
        weeklyWcAdminIds,
        weeklyClientAdminIds,
      );
    }

    // Sort users by name
    reportOverview.monthly.wcAdmins.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    reportOverview.monthly.clientAdmins.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    reportOverview.weekly.wcAdmins.sort((a, b) => a.name.localeCompare(b.name));
    reportOverview.weekly.clientAdmins.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return reportOverview;
  }

  private groupJobSiteSubscriptions(
    monthlySubs: any[],
    weeklySubs: any[],
  ): ClientGroup[] {
    const clientMap = new Map<number, ClientGroup>();
    const jobSiteMap = new Map<number, JobSiteReport>();
    const monthlyWcAdminIds = new Map<number, Set<number>>();
    const monthlyClientAdminIds = new Map<number, Set<number>>();
    const weeklyWcAdminIds = new Map<number, Set<number>>();
    const weeklyClientAdminIds = new Map<number, Set<number>>();

    // Process monthly subscriptions
    for (const sub of monthlySubs) {
      const jobSiteReport = this.getOrCreateJobSiteReport(
        jobSiteMap,
        sub.jobSite,
      );
      if (!jobSiteReport) continue;

      this.getOrCreateClientGroup(clientMap, sub.jobSite, jobSiteReport);

      this.addUserToJobSiteFrequencyReport(
        jobSiteReport,
        sub.user,
        jobSiteReport.monthly,
        monthlyWcAdminIds,
        monthlyClientAdminIds,
      );
    }

    // Process weekly subscriptions
    for (const sub of weeklySubs) {
      const jobSiteReport = this.getOrCreateJobSiteReport(
        jobSiteMap,
        sub.jobSite,
      );
      if (!jobSiteReport) continue;

      this.getOrCreateClientGroup(clientMap, sub.jobSite, jobSiteReport);

      this.addUserToJobSiteFrequencyReport(
        jobSiteReport,
        sub.user,
        jobSiteReport.weekly,
        weeklyWcAdminIds,
        weeklyClientAdminIds,
      );
    }

    // Sort clients by name
    const clientGroups = Array.from(clientMap.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName),
    );

    // Sort job sites within each client by name and sort users within each job site
    for (const clientGroup of clientGroups) {
      clientGroup.jobSites.sort((a, b) =>
        a.jobSiteName.localeCompare(b.jobSiteName),
      );

      // Sort users within each job site
      for (const report of clientGroup.jobSites) {
        report.monthly.wcAdmins.sort((a, b) => a.name.localeCompare(b.name));
        report.monthly.clientAdmins.sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        report.weekly.wcAdmins.sort((a, b) => a.name.localeCompare(b.name));
        report.weekly.clientAdmins.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return clientGroups;
  }

  private getOrCreateClientGroup(
    clientMap: Map<number, ClientGroup>,
    jobSite: any,
    jobSiteReport: JobSiteReport,
  ): ClientGroup {
    const clientId = jobSite?.client?.id || jobSite?.clientId || 0;
    const clientName =
      jobSite?.clientName ||
      jobSite?.client?.name ||
      jobSite?.client?.username ||
      'Unknown Client';
    const roleName = jobSite?.client?.role?.name || 'Unknown Role';

    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        clientId,
        clientName,
        roleName,
        jobSites: [],
      });
    }

    const clientGroup = clientMap.get(clientId)!;
    if (
      !clientGroup.jobSites.find(
        (js) => js.jobSiteId === jobSiteReport.jobSiteId,
      )
    ) {
      clientGroup.jobSites.push(jobSiteReport);
    }

    return clientGroup;
  }

  private getOrCreateJobSiteReport(
    jobSiteMap: Map<number, JobSiteReport>,
    jobSite: any,
  ): JobSiteReport | null {
    if (!jobSite) return null;

    const jobSiteId = jobSite.id;
    if (!jobSiteMap.has(jobSiteId)) {
      const jobSiteName = jobSite.title || `Job Site ${jobSiteId}`;

      jobSiteMap.set(jobSiteId, {
        jobSiteId,
        jobSiteName,
        monthly: { wcAdmins: [], clientAdmins: [] },
        weekly: { wcAdmins: [], clientAdmins: [] },
      });
    }

    return jobSiteMap.get(jobSiteId)!;
  }

  private addUserToJobSiteFrequencyReport(
    jobSiteReport: JobSiteReport,
    user: any,
    section: FrequencyReport['monthly'],
    wcAdminIdsMap: Map<number, Set<number>>,
    clientAdminIdsMap: Map<number, Set<number>>,
  ) {
    if (!user) return;

    const userId = user.id;
    if (!userId) return;

    const primaryName = user.username || 'Unknown User';
    let displayName = '';
    if (user.name) {
      displayName = user.name;
    } else if (user.company) {
      displayName = user.company;
    }

    const userInfo: UserDisplayInfo = {
      name: primaryName,
      displayName,
    };

    const isWcAdmin =
      user.role?.id === RoleEnum.admin || user.role?.id === RoleEnum.cms;

    if (isWcAdmin) {
      if (!wcAdminIdsMap.has(jobSiteReport.jobSiteId)) {
        wcAdminIdsMap.set(jobSiteReport.jobSiteId, new Set());
      }
      const adminIds = wcAdminIdsMap.get(jobSiteReport.jobSiteId)!;
      if (!adminIds.has(userId)) {
        adminIds.add(userId);
        section.wcAdmins.push(userInfo);
      }
    } else {
      if (!clientAdminIdsMap.has(jobSiteReport.jobSiteId)) {
        clientAdminIdsMap.set(jobSiteReport.jobSiteId, new Set());
      }
      const clientIds = clientAdminIdsMap.get(jobSiteReport.jobSiteId)!;
      if (!clientIds.has(userId)) {
        clientIds.add(userId);
        section.clientAdmins.push(userInfo);
      }
    }
  }

  private addUserToFrequencyReport(
    section: FrequencyReport['monthly'],
    user: any,
    adminIds: Set<number>,
    clientIds: Set<number>,
  ) {
    if (!user) return;

    const userId = user.id;
    if (!userId) return;

    const primaryName = user.username || 'Unknown User';
    let displayName = '';
    if (user.name) {
      displayName = user.name;
    } else if (user.company) {
      displayName = user.company;
    }

    const userInfo: UserDisplayInfo = {
      name: primaryName,
      displayName,
    };

    const isWcAdmin =
      user.role?.id === RoleEnum.admin || user.role?.id === RoleEnum.cms;

    if (isWcAdmin) {
      if (!adminIds.has(userId)) {
        adminIds.add(userId);
        section.wcAdmins.push(userInfo);
      }
    } else {
      if (!clientIds.has(userId)) {
        clientIds.add(userId);
        section.clientAdmins.push(userInfo);
      }
    }
  }

  /**
   * Process cumulative reports for clients with cumulative reporting enabled
   */
  private async processCumulativeReports(): Promise<void> {
    try {
      console.log('Processing cumulative reports for enabled clients...');

      // Get all enabled clients
      const enabledConfigs =
        await this.clientReportConfigService.getAllEnabledClients();

      if (enabledConfigs.length === 0) {
        console.log('No clients with cumulative reporting enabled');
        return;
      }

      // Calculate previous month end date
      const now = new Date();
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      // Process each enabled client
      for (const config of enabledConfigs) {
        try {
          const clientId = typeof config.client.id === 'string' 
            ? parseInt(config.client.id, 10) 
            : config.client.id;
          
          if (isNaN(clientId)) {
            console.error(`Invalid client ID: ${config.client.id}`);
            continue;
          }

          console.log(
            `Generating cumulative report for client ${clientId}...`,
          );

          // Generate cumulative Excel report
          const outputPath = process.cwd();
          const result =
            await this.clientExcelReportService.generateCumulativeExcel(
              clientId,
              previousMonthEnd,
              outputPath,
            );

          console.log(
            `Cumulative report generated: ${result.filename} for client ${clientId}`,
          );

          // Get users subscribed to monthly reports for this client
          const subscriptions =
            await this.reportSubscriptionsService.getActiveMonthlySubscriptions();

          const clientSubscriptions = subscriptions.filter(
            (sub) => {
              const subUserId = typeof sub.user?.id === 'string' 
                ? parseInt(sub.user.id, 10) 
                : sub.user?.id;
              const jobSiteClientId = sub.jobSite 
                ? (typeof (sub.jobSite as any).clientId === 'string'
                    ? parseInt((sub.jobSite as any).clientId, 10)
                    : (sub.jobSite as any).clientId)
                : null;
              
              return (
                subUserId === clientId ||
                (jobSiteClientId === clientId &&
                  sub.formats?.includes(ReportFormatEnum.EXCEL))
              );
            },
          );

          // Send email to subscribed users
          for (const subscription of clientSubscriptions) {
            if (subscription.user?.email) {
              try {
                // TODO: Create email template for cumulative reports
                // For now, just log that email should be sent
                console.log(
                  `Would send cumulative report email to ${subscription.user.email}`,
                );
                // await this.mailService.sendCumulativeReportEmail({
                //   to: subscription.user.email,
                //   data: {
                //     name: subscription.user.name || '',
                //     filename: result.filename,
                //     filePath: result.path,
                //   },
                // });
              } catch (emailError) {
                console.error(
                  `Failed to send cumulative report email to ${subscription.user.email}:`,
                  emailError,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `Failed to process cumulative report for client ${config.client.id}:`,
            error,
          );
        }
      }

      console.log('Cumulative reports processing completed');
    } catch (error) {
      console.error('Error processing cumulative reports:', error);
    }
  }
}
