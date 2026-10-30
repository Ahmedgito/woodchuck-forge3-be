import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportSubscriptionsEntity } from './infrastructure/persistence/relational/entities/report-subscriptions.entity';
import { ToggleSubscriptionDto } from './dto/toggle-subscription.dto';
import { ReportSubscription } from './domain/report-subscriptions';
import { ReportTypeEnum } from './report-types.enum';
import { ReportFrequencyEnum } from './report-frequency.enum';
import { ReportFormatEnum } from './report-format.enum';
import { CompressionExtensionEnum } from './compression-extension.enum';
import { MailService } from '../mail/mail.service';
import { User } from '../users/domain/user';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Injectable()
export class ReportSubscriptionsService {
  constructor(
    @InjectRepository(ReportSubscriptionsEntity)
    private reportSubscriptionsRepository: Repository<ReportSubscriptionsEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly mailService: MailService,
  ) {}

  private async getSubscription(
    userId: number | string,
    reportType: ReportTypeEnum,
    frequency: ReportFrequencyEnum,
    jobSiteId?: number,
    withRelations = false,
  ) {
    return this.reportSubscriptionsRepository.findOne({
      relations: withRelations ? ['jobSite'] : [],
      where: {
        user: { id: Number(userId) },
        reportType,
        frequency,
        jobSite: jobSiteId ? { id: jobSiteId } : undefined,
      },
    });
  }

  /**
   * Trims the CC addresses and drops blanks and case-insensitive duplicates so
   * the stored list matches what the mailer would actually send.
   */
  private normalizeCcEmails(emails?: string[]): string[] {
    if (!emails?.length) return [];
    const seen = new Set<string>();
    return emails.reduce<string[]>((acc, raw) => {
      const email = typeof raw === 'string' ? raw.trim() : '';
      if (!email) return acc;
      const normalized = email.toLowerCase();
      if (seen.has(normalized)) return acc;
      seen.add(normalized);
      acc.push(email);
      return acc;
    }, []);
  }

  async toggleSubscription(
    dto: ToggleSubscriptionDto,
    userId: User['id'],
  ): Promise<ReportSubscription> {
    const { reportType, jobSiteId, frequency, isActive, formats, compressionExtension, reportCcEmails } = dto;

    // Check if subscription exists for this frequency
    let subscription = await this.getSubscription(
      userId,
      reportType,
      frequency,
      jobSiteId,
    );

    // Track if state actually changed
    const previousState = subscription?.isActive ?? false;
    const stateChanged = previousState !== isActive;

    // Create or update subscription
    if (!subscription) {
      subscription = this.reportSubscriptionsRepository.create({
        user: { id: Number(userId) },
        reportType,
        frequency,
        jobSite: jobSiteId ? { id: jobSiteId } : null,
        isActive,
        formats: formats ? [...new Set(formats)] : [ReportFormatEnum.PDF],
        compressionExtension: compressionExtension ?? CompressionExtensionEnum.ZIP,
        reportCcEmails: this.normalizeCcEmails(reportCcEmails),
      });
    } else {
      subscription.isActive = isActive;
      if (formats) {
        subscription.formats = [...new Set(formats)];
      }
      if (compressionExtension !== undefined) {
        subscription.compressionExtension = compressionExtension;
      }
      if (reportCcEmails !== undefined) {
        subscription.reportCcEmails = this.normalizeCcEmails(reportCcEmails);
      }
    }

    const saved = await this.reportSubscriptionsRepository.save(subscription);

    // Send email notification only if state actually changed
    if (stateChanged) {
      const user = await this.usersRepository.findOne({
        where: { id: Number(userId) },
      });

      if (user?.email) {
        subscription = await this.getSubscription(
          userId,
          reportType,
          frequency,
          jobSiteId,
          true,
        );

        const emailData = {
          to: user.email,
          data: {
            name: user.name || '',
            jobSiteName: subscription?.jobSite?.title || 'All Job Sites',
            jobSiteId: subscription?.jobSite?.id || jobSiteId,
            frequency,
          },
        };

        if (isActive) {
          this.mailService
            .sendReportSubscriptionEmail(emailData)
            .catch((error) =>
              console.error(
                `Failed to send subscription email for user ${userId}, reportType ${reportType}, frequency ${frequency}, jobSiteId ${jobSiteId}`,
                error,
              ),
            );
        } else {
          this.mailService
            .sendReportUnsubscriptionEmail(emailData)
            .catch((error) =>
              console.error(
                `Failed to send unsubscription email for user ${userId}, reportType ${reportType}, frequency ${frequency}, jobSiteId ${jobSiteId}`,
                error,
              ),
            );
        }
      }
    }

    return saved;
  }

  async findByUser(userId: number | string): Promise<any> {
    const subs = await this.reportSubscriptionsRepository.find({
      relations: ['jobSite'],
      where: { user: { id: Number(userId) } },
    });

    const dashboardSubs = subs.filter(
      (s) => s.reportType === ReportTypeEnum.DASHBOARD,
    );
    const jobSiteSubs = subs.filter(
      (s) => s.reportType === ReportTypeEnum.JOB_SITE,
    );

    // Get all unique formats from dashboard subscriptions
    const dashboardFormats = [
      ...new Set([
        ...(dashboardSubs.find(
          (s) => s.frequency === ReportFrequencyEnum.MONTHLY,
        )?.formats || []),
        ...(dashboardSubs.find(
          (s) => s.frequency === ReportFrequencyEnum.WEEKLY,
        )?.formats || []),
      ]),
    ];

    return {
      dashboard: {
        monthly:
          dashboardSubs.find((s) => s.frequency === ReportFrequencyEnum.MONTHLY)
            ?.isActive || false,
        weekly:
          dashboardSubs.find((s) => s.frequency === ReportFrequencyEnum.WEEKLY)
            ?.isActive || false,
        formats:
          dashboardFormats.length > 0
            ? dashboardFormats
            : [ReportFormatEnum.PDF],
      },
      jobSites: Array.from(
        new Map(
          jobSiteSubs.map((s) => [
            s.jobSite?.id,
            {
              jobSiteId: s.jobSite?.id,
              monthly: false,
              weekly: false,
              formats: [ReportFormatEnum.PDF],
            },
          ]),
        ).values(),
      ).map((base) => {
        const monthly = jobSiteSubs.find(
          (s) =>
            s.jobSite?.id === base.jobSiteId &&
            s.frequency === ReportFrequencyEnum.MONTHLY,
        );
        const weekly = jobSiteSubs.find(
          (s) =>
            s.jobSite?.id === base.jobSiteId &&
            s.frequency === ReportFrequencyEnum.WEEKLY,
        );

        // Get all unique formats for this job site
        const jobSiteFormats = [
          ...new Set([...(monthly?.formats || []), ...(weekly?.formats || [])]),
        ];

        return {
          ...base,
          monthly: monthly?.isActive || false,
          weekly: weekly?.isActive || false,
          formats:
            jobSiteFormats.length > 0 ? jobSiteFormats : [ReportFormatEnum.PDF],
        };
      }),
    };
  }

  async getActiveMonthlySubscriptions(): Promise<ReportSubscription[]> {
    return this.reportSubscriptionsRepository.find({
      where: {
        isActive: true,
        frequency: ReportFrequencyEnum.MONTHLY,
      },
      relations: ['user', 'jobSite', 'jobSite.client', 'jobSite.client.role'],
    });
  }

  async getActiveWeeklySubscriptions(): Promise<ReportSubscription[]> {
    return this.reportSubscriptionsRepository.find({
      where: {
        isActive: true,
        frequency: ReportFrequencyEnum.WEEKLY,
      },
      relations: ['user', 'jobSite', 'jobSite.client', 'jobSite.client.role'],
    });
  }

  async getActiveMonthlyExcelSubscribersByClient(
    clientId: number,
  ): Promise<ReportSubscription[]> {
    const subs = await this.reportSubscriptionsRepository.find({
      where: {
        isActive: true,
        frequency: ReportFrequencyEnum.MONTHLY,
      },
      relations: ['user', 'jobSite', 'jobSite.client'],
    });

    return subs.filter((sub) => {
      const jobSiteClientId =
        (sub.jobSite as any)?.client?.id ?? (sub.jobSite as any)?.clientId;
      return (
        jobSiteClientId === clientId &&
        sub.formats?.includes(ReportFormatEnum.EXCEL)
      );
    });
  }

  async deactivateAllForJobSite(jobSiteId: string | number): Promise<void> {
    await this.reportSubscriptionsRepository.update(
      { jobSite: { id: Number(jobSiteId) } },
      { isActive: false },
    );
  }
}
