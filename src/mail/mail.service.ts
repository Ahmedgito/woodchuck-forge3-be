import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { MailData } from './interfaces/mail-data.interface';
import { AllConfigType } from 'src/config/config.type';
import { MaybeType } from '../utils/types/maybe.type';
import { MailerService } from '../mailer/mailer.service';
import path from 'path';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import { User } from 'src/users/domain/user';
import { Roles } from 'src/roles/roles.enum';

const WOODCHUCK_URL = 'https://woodchuck.ai';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly i18nService: I18nService,
  ) {
    this.registerPartials();
  }

  private formatToDDMMYYYY(date: string | undefined): string | undefined {
    if (!date) return undefined;
    const parts = date.split('-');
    if (parts.length !== 3) return date; // fallback
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }

  private registerPartials() {
    const partialsDir = path.join(__dirname, 'mail-templates', 'partials');
    if (fs.existsSync(partialsDir)) {
      fs.readdirSync(partialsDir).forEach((file) => {
        console.log('Registering partial file', file);
        const partialName = path.basename(file, '.hbs');
        const partialContent = fs.readFileSync(
          path.join(partialsDir, file),
          'utf8',
        );
        Handlebars.registerPartial(partialName, partialContent);
      });
    }
  }

  /** Label shown above the report download links in report emails. */
  private async getDownloadLinksText(
    downloadLinks?: { filename: string; url: string }[],
    weekly?: boolean,
  ): Promise<MaybeType<string>> {
    if (!downloadLinks?.length) return undefined;
    const i18n = I18nContext.current() || this.i18nService;
    if (!i18n) return undefined;
    // Use the "cumulative monthly" wording only for monthly reports that
    // actually contain a cumulative report. Weekly reports are never cumulative,
    // and non-cumulative monthly reports (e.g. the admin consolidated report)
    // use the generic wording. The cumulative link label is tagged "Cumulative "
    // by the report consumer.
    const hasCumulative = downloadLinks.some((l) =>
      l.filename.toLowerCase().includes('cumulative '),
    );
    const key =
      !weekly && hasCumulative
        ? 'common.downloadCumulativeReportsText'
        : 'common.downloadReportsText';
    return i18n.t(key);
  }

  private getFrontendUrl(path: string): string {
    const base = this.configService.getOrThrow('app.frontendDomain', {
      infer: true,
    });
    return `${base}${path}`;
  }

  /** Lower-cased set of the explicit recipients of an email. */
  private toAddressSet(to?: string | string[]): Set<string> {
    const toList = Array.isArray(to) ? to : to ? [to] : [];
    return new Set(toList.map((e) => e.toLowerCase()));
  }

  /**
   * Normalises the CC list carried by a report email.
   *
   * The list comes from the subscription that produced the report
   * (report_subscriptions.reportCcEmails), not from configuration, so each
   * subscription decides who is copied on its own reports.
   *
   * Unlike BCC, a CC address is visible to every recipient of the email.
   *
   * Blank entries and duplicates are dropped, as is anyone already listed in
   * `to` — an address that is both a subscriber and a CC would otherwise be
   * delivered the same report twice.
   */
  private getReportCc(cc?: string[], to?: string | string[]): string[] {
    if (!cc?.length) return [];

    const toSet = this.toAddressSet(to);
    const seen = new Set<string>();

    return cc.reduce<string[]>((acc, raw) => {
      const email = raw?.trim();
      if (!email) return acc;
      const normalized = email.toLowerCase();
      if (toSet.has(normalized) || seen.has(normalized)) return acc;
      seen.add(normalized);
      acc.push(email);
      return acc;
    }, []);
  }

  /**
   * Returns internal admin emails (from INTERNAL_REPORT_BCC_EMAILS env var)
   * to be silently BCC'd on every client-facing report email.
   *
   * Recipients listed in `to`, and addresses already being CC'd, are NOT added
   * — internal admins are only added if they are not already receiving the
   * email, which prevents duplicate deliveries for cases where an internal
   * admin is also a subscriber or an internal CC recipient.
   */
  private getInternalReportBcc(
    to?: string | string[],
    cc?: string[],
  ): string[] {
    const internal =
      (this.configService.get('mail.internalReportBccEmails', {
        infer: true,
      }) as string[] | undefined) ?? [];
    if (internal.length === 0) return [];

    const toSet = this.toAddressSet(to);
    const ccSet = new Set(
      this.getReportCc(cc, to).map((e) => e.toLowerCase()),
    );

    return internal.filter((email) => {
      const normalized = email.toLowerCase();
      return !toSet.has(normalized) && !ccSet.has(normalized);
    });
  }

  private async sendMail(options: any): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let footerText1: MaybeType<string>;
    let footerText2: MaybeType<string>;
    let footerText3: MaybeType<string>;
    if (i18n) {
      [footerText1, footerText2, footerText3] = await Promise.all([
        i18n.t('footer.footerText1'),
        i18n.t('footer.footerText2'),
        i18n.t('footer.footerText3'),
      ]);
    }

    const defaultContext = {
      app_name: this.configService.get('app.name', { infer: true }),
      linkUrl: WOODCHUCK_URL,
      footerText1,
      footerText2,
      footerText3,
    };

    const mergedOptions = {
      ...options, // keep all provided options
      context: {
        ...defaultContext,
        ...(options.context || {}),
      },
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, './mail-templates/images/logo.png'),
          cid: 'logo',
        },
        {
          filename: 'c-logo.png',
          path: path.join(__dirname, './mail-templates/images/c-logo.png'),
          cid: 'c-logo',
        },
        {
          filename: 'footer-logo.png',
          path: path.join(__dirname, './mail-templates/images/footer-logo.png'),
          cid: 'footer-logo',
        },
        ...(options.attachments || []),
      ],
    };

    await this.mailerService.sendMail(mergedOptions);
  }

  async userSignUp(
    mailData: MailData<{ hash: string; user: User }>,
  ): Promise<void> {
    const i18n = I18nContext.current();
    let emailConfirmTitle: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    let text5: MaybeType<string>;
    let text6: MaybeType<string>;
    let text7: MaybeType<string>;
    let text8: MaybeType<string>;
    let text9: MaybeType<string>;

    const url = new URL(this.getFrontendUrl('/confirm-email'));
    url.searchParams.set('hash', mailData.data.hash);

    const { company, role, name: userName, email } = mailData.data.user;
    if (i18n) {
      const userRole = role ? Roles[role.id] : '';
      [
        emailConfirmTitle,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
        text9,
      ] = await Promise.all([
        i18n.t('common.confirmEmail', {
          args: { company },
        }),
        i18n.t('confirm-email.text1', {
          args: { userName },
        }),
        i18n.t('confirm-email.text2'),
        i18n.t('confirm-email.text3'),
        i18n.t('confirm-email.text4'),
        i18n.t('confirm-email.text5', {
          args: { userRole },
        }),
        i18n.t('confirm-email.text6', {
          args: { email },
        }),
        i18n.t('confirm-email.text7', {
          args: { company },
        }),
        i18n.t('confirm-email.text8'),
        i18n.t('confirm-email.text9', {
          args: { url },
        }),
      ]);
    }

    await this.sendMail({
      to: mailData.to,
      subject: `${emailConfirmTitle}${company ? ', ' + company : ''}`,
      text: `${url.toString()} ${emailConfirmTitle}`,
      templatePath: path.join(__dirname, 'mail-templates', 'activation.hbs'),
      context: {
        title: emailConfirmTitle,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
        text9,
        company,
      },
    });
  }

  async forgotPassword(mailData: MailData<{ hash: string }>): Promise<void> {
    const i18n = I18nContext.current();
    let resetPasswordTitle: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    let text5: MaybeType<string>;
    let text6: MaybeType<string>;
    let text7: MaybeType<string>;
    let text8: MaybeType<string>;
    let resetBtnText: MaybeType<string>;

    if (i18n) {
      [
        resetPasswordTitle,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
        resetBtnText,
      ] = await Promise.all([
        i18n.t('common.resetPassword'),
        i18n.t('reset-password.text1'),
        i18n.t('reset-password.text2'),
        i18n.t('reset-password.text3'),
        i18n.t('reset-password.text4'),
        i18n.t('reset-password.text5'),
        i18n.t('reset-password.text6'),
        i18n.t('reset-password.text7'),
        i18n.t('reset-password.text8'),
        i18n.t('reset-password.resetBtnText'),
      ]);
    }

    const url = new URL(this.getFrontendUrl('/password-change'));
    url.searchParams.set('hash', mailData.data.hash);

    await this.sendMail({
      to: mailData.to,
      subject: resetPasswordTitle,
      text: `${url.toString()} ${resetPasswordTitle}`,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'reset-password.hbs',
      ),
      context: {
        title: resetPasswordTitle,
        url: url.toString(),
        actionTitle: resetBtnText,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
      },
    });
  }

  async pollutedDumpsterNotification(
    mailData: MailData<{
      jobSiteName: string;
      jobSiteId?: number;
      wasteStreamName: string;
      wasteStreamType: string;
    }>,
    isReminder = false,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService; // adding fallback to i18nService because this function is already used from cron module and I18nContext only supports route handlers
    let pollutedDumpsterNotification: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    let text5: MaybeType<string>;
    let text6: MaybeType<string>;
    let text7: MaybeType<string>;
    let text8: MaybeType<string>;
    let text9: MaybeType<string>;
    let text10: MaybeType<string>;

    if (i18n) {
      const { wasteStreamName, wasteStreamType, jobSiteName, jobSiteId } =
        mailData.data;

      let jobsitelink: string;
      if (jobSiteId) {
        jobsitelink = this.getFrontendUrl(`/jobSites?id=${jobSiteId}`);
      } else {
        jobsitelink = this.getFrontendUrl('/');
      }

      [
        pollutedDumpsterNotification,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
        text9,
        text10,
      ] = await Promise.all([
        i18n.t('common.pollutedDumpsterNotification', {
          args: { jobSiteName, wasteStreamName },
        }),
        i18n.t('polluted-dumpster-notification.text1'),
        i18n.t('polluted-dumpster-notification.text2'),
        i18n.t('polluted-dumpster-notification.text3', {
          args: { jobSiteName },
        }),
        i18n.t('polluted-dumpster-notification.text4', {
          args: { jobsitelink },
        }),
        i18n.t('polluted-dumpster-notification.text5', {
          args: { wasteStreamName, wasteStreamType },
        }),
        i18n.t('polluted-dumpster-notification.text6'),
        i18n.t('polluted-dumpster-notification.text7'),
        i18n.t('polluted-dumpster-notification.text8'),
        i18n.t('polluted-dumpster-notification.text9'),
        i18n.t('polluted-dumpster-notification.text10'),
      ]);
    }

    const subject = isReminder
      ? `Reminder | ${pollutedDumpsterNotification}`
      : pollutedDumpsterNotification;

    await this.sendMail({
      to: mailData.to,
      subject,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'polluted-dumpster-notification.hbs',
      ),
      context: {
        title: pollutedDumpsterNotification,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
        text9,
        text10,
      },
    });
  }

  async fillLevelNotification(
    mailData: MailData<{
      jobSiteName: string;
      wasteStreamName: string;
      wasteStreamType: string;
      threshold: number;
      fillPercentage: number;
    }>,
  ) {
    const templateName = 'fill-level-threshold-exceed-notification';
    const i18n = I18nContext.current() || this.i18nService;
    let fillLevelNotification: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    let text5: MaybeType<string>;
    let text6: MaybeType<string>;
    let text7: MaybeType<string>;
    let text8: MaybeType<string>;
    let text9: MaybeType<string>;
    let text10: MaybeType<string>;
    let text11: MaybeType<string>;

    if (i18n) {
      const {
        wasteStreamName,
        wasteStreamType,
        jobSiteName,
        threshold,
        fillPercentage,
      } = mailData.data;
      [
        fillLevelNotification,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
        text9,
        text10,
        text11,
      ] = await Promise.all([
        i18n.t('common.fillLevelThresholdExceedNotification', {
          args: { jobSiteName, wasteStreamName },
        }),
        i18n.t(`${templateName}.text1`),
        i18n.t(`${templateName}.text2`),
        i18n.t(`${templateName}.text3`),
        i18n.t(`${templateName}.text4`, {
          args: { jobSiteName },
        }),
        i18n.t(`${templateName}.text5`, {
          args: { wasteStreamName, wasteStreamType },
        }),
        i18n.t(`${templateName}.text6`, {
          args: { threshold },
        }),
        i18n.t(`${templateName}.text7`, {
          args: { fillPercentage },
        }),
        i18n.t(`${templateName}.text8`),
        i18n.t(`${templateName}.text9`),
        i18n.t(`${templateName}.text10`),
        i18n.t(`${templateName}.text11`),
      ]);
    }

    await this.sendMail({
      to: mailData.to,
      subject: fillLevelNotification,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        `${templateName}.hbs`,
      ),
      context: {
        title: fillLevelNotification,
        text1,
        text2,
        text3,
        text4,
        text5,
        text6,
        text7,
        text8,
        text9,
        text10,
        text11,
      },
    });
  }

  async archiveReportsEmail(mailData: MailData<any>): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService; // adding fallback to i18nService because this function is already used from cron module and I18nContext only supports route handlers
    let archiveMonthlyReports: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    const {
      name,
      jobSiteName,
      reportMonths = [],
      downloadLinks = [],
    } = mailData.data;

    if (i18n) {
      [archiveMonthlyReports, text1, text2, text3] = await Promise.all([
        i18n.t('common.archiveMonthlyReports'),
        i18n.t('archive-report-email.text1', {
          args: { name },
        }),
        i18n.t('archive-report-email.text2', {
          args: { jobSiteName },
        }),
        i18n.t('archive-report-email.text3'),
      ]);
    }
    const downloadLinksText = await this.getDownloadLinksText(downloadLinks);

    await this.sendMail({
      to: mailData.to,
      cc: this.getReportCc(mailData.cc, mailData.to),
      bcc: this.getInternalReportBcc(mailData.to, mailData.cc),
      subject: archiveMonthlyReports,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'archive-report-email.hbs',
      ),
      context: {
        title: archiveMonthlyReports,
        text1,
        text2,
        text3,
        reportMonths,
        downloadLinks,
        downloadLinksText,
      },
    });
  }

  async sendReportSubscriptionEmail(
    mailData: MailData<{
      name: string;
      jobSiteName: string;
      jobSiteId?: number;
      frequency?: string;
    }>,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let subject: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    const {
      name,
      jobSiteName,
      jobSiteId,
      frequency = 'monthly',
    } = mailData.data;

    if (i18n) {
      [subject, text1, text2, text3, text4] = await Promise.all([
        i18n.t('common.reportSubscriptionEmail'),
        i18n.t('report-subscription.text1', {
          args: { name },
        }),
        i18n.t('report-subscription.text2', {
          args: { jobSiteName, frequency },
        }),
        i18n.t('report-subscription.text3', {
          args: { frequency },
        }),
        i18n.t('report-subscription.text4', {
          args: { frequency },
        }),
      ]);
    }

    let unsubscribeUrl: string;
    if (jobSiteId) {
      unsubscribeUrl = this.getFrontendUrl(`/jobSites?id=${jobSiteId}`);
    } else {
      unsubscribeUrl = this.getFrontendUrl('/');
    }

    await this.sendMail({
      to: mailData.to,
      subject,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'report-subscription.hbs',
      ),
      context: {
        title: subject,
        text1,
        text2,
        text3,
        text4,
        unsubscribeUrl,
      },
    });
  }

  async sendReportUnsubscriptionEmail(
    mailData: MailData<{
      name: string;
      jobSiteName: string;
      jobSiteId?: string | number;
      frequency?: string;
    }>,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let subject: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    const {
      name,
      jobSiteName,
      jobSiteId,
      frequency = 'monthly',
    } = mailData.data;

    if (i18n) {
      [subject, text1, text2, text3, text4] = await Promise.all([
        i18n.t('common.reportUnsubscriptionEmail'),
        i18n.t('report-unsubscription.text1', {
          args: { name },
        }),
        i18n.t('report-unsubscription.text2', {
          args: { jobSiteName, frequency },
        }),
        i18n.t('report-unsubscription.text3', {
          args: { frequency },
        }),
        i18n.t('report-unsubscription.text4', {
          args: { frequency },
        }),
      ]);
    }

    let subscribeUrl: string;
    if (jobSiteId) {
      subscribeUrl = this.getFrontendUrl(`/jobSites?id=${jobSiteId}`);
    } else {
      subscribeUrl = this.getFrontendUrl('/');
    }

    await this.sendMail({
      to: mailData.to,
      subject,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'report-unsubscription.hbs',
      ),
      context: {
        title: subject,
        text1,
        text2,
        text3,
        text4,
        subscribeUrl,
      },
    });
  }

  async sendMonthlyReportEmail(
    mailData: MailData<{
      name: string | null;
      jobSiteName: string | null | undefined;
      jobSiteId?: number;
      reportMonth: string;
      downloadLinks?: { filename: string; url: string }[];
      weekly?: boolean;
      started?: string;
      ended?: string;
      frequency?: string;
    }>,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let subject: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    const {
      name,
      jobSiteName,
      jobSiteId,
      reportMonth,
      downloadLinks = [],
      weekly,
      started,
      ended,
      frequency = 'monthly',
    } = mailData.data;
    if (i18n) {
      [subject, text1, text2, text3, text4] = await Promise.all([
        i18n.t('common.monthlyReportEmail', {
          args: { jobSiteName, frequency },
        }),
        i18n.t('monthly-report.text1', {
          args: { name },
        }),
        i18n.t('monthly-report.text2', {
          args: {
            jobSiteName,
            frequency,
          },
        }),
        i18n.t('monthly-report.text3'),
        i18n.t('monthly-report.text4', {
          args: { frequency },
        }),
      ]);
    }

    let unsubscribeUrl: string;
    if (jobSiteId) {
      unsubscribeUrl = this.getFrontendUrl(`/jobSites?id=${jobSiteId}`);
    } else {
      unsubscribeUrl = this.getFrontendUrl('/');
    }

    await this.sendMail({
      to: mailData.to,
      cc: this.getReportCc(mailData.cc, mailData.to),
      bcc: this.getInternalReportBcc(mailData.to, mailData.cc),
      subject,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'monthly-report.hbs',
      ),
      context: {
        title: subject,
        text1,
        text2,
        text3,
        text4,
        reportMonth:
          weekly && started && ended
            ? `${this.formatToDDMMYYYY(started)} - ${this.formatToDDMMYYYY(ended)}`
            : reportMonth,
        frequency: weekly ? 'weekly' : 'monthly',
        unsubscribeUrl,
        downloadLinks,
        downloadLinksText: await this.getDownloadLinksText(
          downloadLinks,
          weekly,
        ),
      },
    });
  }

  async archiveDashboardReportsEmail(mailData: MailData<any>): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let archiveDashboardReports: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    const { name, reportMonths = [], downloadLinks = [] } = mailData.data;

    if (i18n) {
      [archiveDashboardReports, text1, text2, text3] = await Promise.all([
        i18n.t('common.archiveDashboardReports'),
        i18n.t('archive-dashboard-report-email.text1', { args: { name } }),
        i18n.t('archive-dashboard-report-email.text2'),
        i18n.t('archive-dashboard-report-email.text3'),
      ]);
    }

    await this.sendMail({
      to: mailData.to,
      cc: this.getReportCc(mailData.cc, mailData.to),
      bcc: this.getInternalReportBcc(mailData.to, mailData.cc),
      subject: archiveDashboardReports,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'archive-dashboard-report-email.hbs',
      ),
      context: {
        title: archiveDashboardReports,
        text1,
        text2,
        text3,
        reportMonths,
        downloadLinks,
        downloadLinksText: await this.getDownloadLinksText(downloadLinks),
      },
    });
  }

  async sendMonthlyReportAdminEmail(
    mailData: MailData<{
      name: string | null;
      clientJobSiteList: string;
      reportMonth: string;
      downloadLinks?: { filename: string; url: string }[];
      frequency?: string;
      weekly?: boolean;
      started?: string;
      ended?: string;
    }>,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let subject: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    const {
      name,
      clientJobSiteList,
      reportMonth,
      downloadLinks = [],
      weekly,
      started,
      ended,
      frequency = 'monthly',
    } = mailData.data;
    if (i18n) {
      [subject, text1, text2, text3, text4] = await Promise.all([
        i18n.t('common.monthlyReportAdminEmail', {
          args: { jobSiteName: '', frequency },
        }),
        i18n.t('monthly-admin-report.text1', { args: { name } }),
        i18n.t('monthly-admin-report.text2', {
          args: { jobSiteName: '', frequency },
        }),
        i18n.t('monthly-admin-report.text3'),
        i18n.t('monthly-admin-report.text4', { args: { frequency } }),
      ]);
    }
    await this.sendMail({
      to: mailData.to,
      cc: this.getReportCc(mailData.cc, mailData.to),
      bcc: this.getInternalReportBcc(mailData.to, mailData.cc),
      subject,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'monthly-report-admin.hbs',
      ),
      context: {
        title: subject,
        text1,
        text2,
        text3,
        text4,
        reportMonth:
          weekly && started && ended
            ? `${this.formatToDDMMYYYY(started)} - ${this.formatToDDMMYYYY(ended)}`
            : reportMonth,
        clientJobSiteList,
        frequency: weekly ? 'weekly' : 'monthly',
        unsubscribeUrl: this.getFrontendUrl('/'),
        downloadLinks,
        downloadLinksText: await this.getDownloadLinksText(
          downloadLinks,
          weekly,
        ),
      },
    });
  }

  async sendDashboardReportAdminEmail(
    mailData: MailData<{
      name: string | null;
      reportMonths: string[];
      downloadLinks?: { filename: string; url: string }[];
      weekly?: boolean;
      started?: string;
      ended?: string;
      frequency?: string;
    }>,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let subject: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    let text5: MaybeType<string>;
    const {
      name,
      reportMonths,
      downloadLinks = [],
      weekly,
      started,
      ended,
      frequency = 'monthly',
    } = mailData.data;
    if (i18n) {
      [subject, text1, text2, text3, text4, text5] = await Promise.all([
        i18n.t('common.monthlyReportDashboardAdmin', { args: { frequency } }),
        i18n.t('dashboard-report-admin.text1', { args: { name } }),
        i18n.t('dashboard-report-admin.text2', { args: { frequency } }),
        i18n.t('dashboard-report-admin.text3'),
        i18n.t('dashboard-report-admin.text4'),
        i18n.t('dashboard-report-admin.text5', { args: { frequency } }),
      ]);
    }
    await this.sendMail({
      to: mailData.to,
      cc: this.getReportCc(mailData.cc, mailData.to),
      bcc: this.getInternalReportBcc(mailData.to, mailData.cc),
      subject,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'dashboard-report-admin.hbs',
      ),
      context: {
        title: subject,
        text1,
        text2,
        text3,
        text4,
        text5,
        reportMonths:
          weekly && started && ended
            ? `${this.formatToDDMMYYYY(started)} - ${this.formatToDDMMYYYY(ended)}`
            : reportMonths.join(', '),
        unsubscribeUrl: this.getFrontendUrl('/'),
        downloadLinks,
        downloadLinksText: await this.getDownloadLinksText(
          downloadLinks,
          weekly,
        ),
      },
    });
  }

  async sendDashboardReportUserEmail(
    mailData: MailData<{
      name: string | null;
      company: string | null;
      jobSiteList: string;
      reportMonths: string[];
      downloadLinks?: { filename: string; url: string }[];
      frequency?: string;
      weekly?: boolean;
      started?: string;
      ended?: string;
    }>,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let subject: MaybeType<string>;
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;
    let text5: MaybeType<string>;
    const {
      name,
      company,
      jobSiteList,
      reportMonths,
      downloadLinks = [],
      weekly,
      started,
      ended,
      frequency = 'monthly',
    } = mailData.data;
    if (i18n) {
      [subject, text1, text2, text3, text4, text5] = await Promise.all([
        i18n.t('common.monthlyReportDashboardUser', { args: { frequency } }),
        i18n.t('dashboard-report-user.text1', { args: { name } }),
        i18n.t('dashboard-report-user.text2', { args: { company, frequency } }),
        i18n.t('dashboard-report-user.text3'),
        i18n.t('dashboard-report-user.text4'),
        i18n.t('dashboard-report-user.text5', { args: { frequency } }),
      ]);
    }
    await this.sendMail({
      to: mailData.to,
      cc: this.getReportCc(mailData.cc, mailData.to),
      bcc: this.getInternalReportBcc(mailData.to, mailData.cc),
      subject,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'dashboard-report-user.hbs',
      ),
      context: {
        title: subject,
        text1,
        text2,
        text3,
        text4,
        text5,
        reportMonths:
          weekly && started && ended
            ? `${this.formatToDDMMYYYY(started)} - ${this.formatToDDMMYYYY(ended)}`
            : reportMonths.join(', '),
        jobSiteList,
        unsubscribeUrl: this.getFrontendUrl('/'),
        downloadLinks,
        downloadLinksText: await this.getDownloadLinksText(
          downloadLinks,
          weekly,
        ),
      },
    });
  }

  async sendReportOverviewEmail(
    mailData: MailData<{
      adminName: string;
      reportOverview: {
        dashboard: {
          monthly: {
            wcAdmins: Array<{ name: string; displayName: string }>;
            clientAdmins: Array<{ name: string; displayName: string }>;
          };
          weekly: {
            wcAdmins: Array<{ name: string; displayName: string }>;
            clientAdmins: Array<{ name: string; displayName: string }>;
          };
        };
        jobSites: Array<{
          clientId: number;
          clientName: string;
          roleName: string;
          jobSites: Array<{
            jobSiteId: number;
            jobSiteName: string;
            monthly: {
              wcAdmins: Array<{ name: string; displayName: string }>;
              clientAdmins: Array<{ name: string; displayName: string }>;
            };
            weekly: {
              wcAdmins: Array<{ name: string; displayName: string }>;
              clientAdmins: Array<{ name: string; displayName: string }>;
            };
          }>;
        }>;
      };
    }>,
  ): Promise<void> {
    const i18n = I18nContext.current() || this.i18nService;
    let subject: MaybeType<string>;
    let greeting: MaybeType<string>;
    let intro: MaybeType<string>;
    let monthlyReportLabel: MaybeType<string>;
    let weeklyReportLabel: MaybeType<string>;
    let wcAdminLabel: MaybeType<string>;
    let clientAdminLabel: MaybeType<string>;
    let noSubscriptionText: MaybeType<string>;
    let dashboardLabel: MaybeType<string>;
    let jobSitesLabel: MaybeType<string>;

    if (i18n) {
      [
        subject,
        greeting,
        intro,
        monthlyReportLabel,
        weeklyReportLabel,
        wcAdminLabel,
        clientAdminLabel,
        noSubscriptionText,
        dashboardLabel,
        jobSitesLabel,
      ] = await Promise.all([
        i18n.t('common.reportOverviewEmailSubject'),
        i18n.t('report-overview.greeting'),
        i18n.t('report-overview.intro'),
        i18n.t('report-overview.monthlyReportLabel'),
        i18n.t('report-overview.weeklyReportLabel'),
        i18n.t('report-overview.wcAdminLabel'),
        i18n.t('report-overview.clientAdminLabel'),
        i18n.t('report-overview.noSubscriptionText'),
        i18n.t('report-overview.dashboardLabel'),
        i18n.t('report-overview.jobSitesLabel'),
      ]);
    } else {
      subject = 'Weekly Report Overview';
      greeting = 'Hello Super Admins,';
      intro =
        'Here is the weekly overview of active reports requested by Woodchuck users.';
      monthlyReportLabel = 'Monthly Report:';
      weeklyReportLabel = 'Weekly Report:';
      wcAdminLabel = 'WC ADMIN';
      clientAdminLabel = 'CLIENT ADMIN';
      noSubscriptionText = 'No one has subscribed.';
      dashboardLabel = 'Dashboard';
      jobSitesLabel = 'Job Sites';
    }

    await this.sendMail({
      to: mailData.to,
      subject: subject || 'Weekly Report Overview',
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'report-overview.hbs',
      ),
      context: {
        title: subject || 'Weekly Report Overview',
        greeting: greeting || 'Hello Super Admins,',
        intro:
          intro ||
          'Here is the weekly overview of active reports requested by Woodchuck users.',
        monthlyReportLabel: monthlyReportLabel || 'Monthly report:',
        weeklyReportLabel: weeklyReportLabel || 'Weekly report:',
        wcAdminLabel: wcAdminLabel || 'WC ADMIN',
        clientAdminLabel: clientAdminLabel || 'CLIENT ADMIN',
        noSubscriptionText: noSubscriptionText || 'No one has subscribed.',
        dashboardLabel: dashboardLabel || 'Dashboard',
        jobSitesLabel: jobSitesLabel || 'Job Sites',
        reportOverview: mailData.data.reportOverview,
      },
    });
  }
}
