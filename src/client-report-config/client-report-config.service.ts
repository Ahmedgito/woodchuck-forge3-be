import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientReportConfigEntity } from './infrastructure/persistence/relational/entities/client-report-config.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { ClientExcelReportService } from 'src/report-export/client-excel-report.service';
import { MailService } from 'src/mail/mail.service';
import { ReportSubscriptionsService } from 'src/report-subscriptions/report-subscriptions.service';
import { ReportLoggerService } from 'src/report-logger/report-logger.service';
import { ReportS3StorageService } from 'src/report-downloads/report-s3-storage.service';
import { endOfMonth, subMonths } from 'date-fns';
import * as fs from 'fs';

@Injectable()
export class ClientReportConfigService {
  constructor(
    @InjectRepository(ClientReportConfigEntity)
    private clientReportConfigRepository: Repository<ClientReportConfigEntity>,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly clientExcelReportService: ClientExcelReportService,
    private readonly mailService: MailService,
    private readonly reportSubscriptionsService: ReportSubscriptionsService,
    private readonly reportLogger: ReportLoggerService,
    private readonly reportS3Storage: ReportS3StorageService,
  ) {}

  async findByClientId(
    clientId: number,
  ): Promise<ClientReportConfigEntity | null> {
    return this.clientReportConfigRepository.findOne({
      where: { client: { id: clientId } },
      relations: ['client'],
    });
  }

  async isEnabled(clientId: number): Promise<boolean> {
    // Check the client's own config first
    const config = await this.findByClientId(clientId);
    if (config?.enabled) {
      return true;
    }

    // If not enabled, check if this user is a sub-user and fall back to parent
    const user = await this.usersRepository.findOne({
      where: { id: clientId },
    });

    if (user?.isSubUser && user?.parentUserId) {
      const parentConfig = await this.findByClientId(user.parentUserId);
      return parentConfig?.enabled ?? false;
    }

    return false;
  }

  async getAllEnabledClients(): Promise<ClientReportConfigEntity[]> {
    return this.clientReportConfigRepository.find({
      where: { enabled: true },
      relations: ['client'],
    });
  }

  async enable(clientId: number): Promise<ClientReportConfigEntity> {
    let config = await this.findByClientId(clientId);

    if (!config) {
      const client = await this.usersRepository.findOne({
        where: { id: clientId },
      });
      if (!client) {
        throw new Error(`Client with id ${clientId} not found`);
      }

      config = this.clientReportConfigRepository.create({
        client: { id: clientId },
        enabled: true,
      });
    } else {
      config.enabled = true;
    }

    return this.clientReportConfigRepository.save(config);
  }

  async disable(clientId: number): Promise<ClientReportConfigEntity> {
    const config = await this.findByClientId(clientId);
    if (!config) {
      throw new Error(`Config for client ${clientId} not found`);
    }

    config.enabled = false;
    return this.clientReportConfigRepository.save(config);
  }

  async toggle(clientId: number): Promise<ClientReportConfigEntity> {
    const config = await this.findByClientId(clientId);
    if (!config) {
      return this.enable(clientId);
    }

    config.enabled = !config.enabled;
    return this.clientReportConfigRepository.save(config);
  }

  async sendCumulativeReport(
    clientId: number,
    asOfDate?: string,
  ): Promise<{ sent: number; filename: string }> {
    const client = await this.usersRepository.findOne({
      where: { id: clientId },
    });
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    const now = new Date();
    const previousMonthEnd = asOfDate
      ? endOfMonth(new Date(asOfDate))
      : endOfMonth(subMonths(now, 1));
    const outputPath = process.cwd();

    const result = await this.clientExcelReportService.generateCumulativeExcel(
      clientId,
      previousMonthEnd,
      outputPath,
    );

    console.log(`[sendCumulativeReport] clientId=${clientId} asOfDate=${asOfDate} previousMonthEnd=${previousMonthEnd.toISOString()}`);
    void this.reportLogger.log(
      `sendCumulativeReport triggered for clientId=${clientId}`,
      'ClientReportConfigService',
      { clientId, clientName: client.name, asOfDate, previousMonthEnd: previousMonthEnd.toISOString(), filename: result.filename },
    );

    const subscribers =
      await this.reportSubscriptionsService.getActiveMonthlyExcelSubscribersByClient(
        clientId,
      );

    console.log(`[sendCumulativeReport] raw subscribers count=${subscribers.length}`, JSON.stringify(subscribers.map(s => ({
      id: s.id,
      isActive: s.isActive,
      frequency: s.frequency,
      formats: s.formats,
      userEmail: s.user?.email,
      jobSiteId: (s.jobSite as any)?.id,
      jobSiteClientId: (s.jobSite as any)?.client?.id ?? (s.jobSite as any)?.clientId,
    }))));
    void this.reportLogger.log(
      `Active monthly Excel subscribers fetched: ${subscribers.length}`,
      'ClientReportConfigService',
      { clientId, subscriberCount: subscribers.length, subscribers: subscribers.map(s => ({ id: s.id, userEmail: s.user?.email, formats: s.formats, frequency: s.frequency, isActive: s.isActive, jobSiteClientId: (s.jobSite as any)?.client?.id ?? (s.jobSite as any)?.clientId })) },
    );

    const uniqueEmails = [
      ...new Map(
        subscribers
          .filter((s) => s.user?.email)
          .map((s) => [s.user.email, s.user]),
      ).values(),
    ];

    console.log(`[sendCumulativeReport] uniqueEmails count=${uniqueEmails.length}`, uniqueEmails.map(u => u.email));
    void this.reportLogger.log(
      `Unique email recipients: ${uniqueEmails.length}`,
      'ClientReportConfigService',
      { clientId, uniqueEmails: uniqueEmails.map(u => u.email) },
    );

    const reportMonthLabel = previousMonthEnd.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    // Deliver the cumulative Excel via a secure download link (never an email
    // attachment). The file is identical for every recipient, so upload it once
    // and reuse the same permanent link. The "Cumulative" marker in the label
    // makes the email use the cumulative wording. A failed upload is fatal —
    // without a link the email would carry no report — so let it propagate.
    const uploadedCumulative = await this.reportS3Storage.uploadReportArchive({
      filename: result.filename,
      path: result.path,
    });
    const downloadLinks = [
      {
        filename: `${reportMonthLabel} Cumulative Excel Report`,
        url: uploadedCumulative.downloadUrl,
      },
    ];

    let sent = 0;
    for (const user of uniqueEmails) {
      try {
        console.log(`[sendCumulativeReport] sending email to ${user.email}`);
        await this.mailService.sendMonthlyReportEmail({
          to: user.email!,
          data: {
            name: user.name || '',
            jobSiteName: client.name || client.username || 'Your job sites',
            reportMonth: reportMonthLabel,
            downloadLinks,
            frequency: 'monthly',
          },
        });
        void this.reportLogger.log(
          `Cumulative report manually sent to ${user.email}`,
          'ClientReportConfigService',
          { clientId, clientName: client.name, email: user.email, filename: result.filename, isCumulative: true },
        );
        sent++;
      } catch (err) {
        console.error(`[sendCumulativeReport] failed to send to ${user.email}`, err);
        void this.reportLogger.error(
          `Failed to send cumulative report to ${user.email}: ${err?.message}`,
          'ClientReportConfigService',
          { clientId, email: user.email, error: err?.message },
        );
      }
    }

    console.log(`[sendCumulativeReport] done. sent=${sent} filename=${result.filename}`);
    void this.reportLogger.log(
      `sendCumulativeReport completed. sent=${sent}`,
      'ClientReportConfigService',
      { clientId, sent, filename: result.filename },
    );

    try {
      fs.unlinkSync(result.path);
    } catch (_) {}

    return { sent, filename: result.filename };
  }

  async generateReport(
    clientId: number,
  ): Promise<{ filename: string; path: string }> {
    const client = await this.usersRepository.findOne({
      where: { id: clientId },
    });
    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    const now = new Date();
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    const outputPath = process.cwd();

    console.log(
      `Manually generating cumulative report for client ${clientId}...`,
    );

    const result = await this.clientExcelReportService.generateCumulativeExcel(
      clientId,
      previousMonthEnd,
      outputPath,
    );

    console.log(
      `Cumulative report generated: ${result.filename} for client ${clientId}`,
    );

    return result;
  }
}
