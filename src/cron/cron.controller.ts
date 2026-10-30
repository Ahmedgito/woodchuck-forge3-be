import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { ReportEmailJobService } from './jobs/monthly-report-email-job.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TriggerMonthlyReportDto } from './dto/trigger-monthly-report.dto';

@ApiBearerAuth()
@ApiTags('Cron Jobs')
@Controller({ path: 'cron', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.admin)
export class CronController {
  constructor(private readonly reportEmailJobService: ReportEmailJobService) {}

  @Post('trigger-weekly-overview-email')
  @ApiOperation({ summary: 'Manually trigger Weekly Overview Email' })
  async triggerWeeklyOverviewEmail() {
    await this.reportEmailJobService.handleReportOverviewEmail();
    return {
      success: true,
      message: 'Weekly Overview Email job has been triggered',
    };
  }

  @Post('trigger-monthly-report')
  @ApiOperation({ summary: 'Manually trigger Monthly Report Email job' })
  async triggerMonthlyReport(@Body() body: TriggerMonthlyReportDto = {}) {
    await this.reportEmailJobService.handleMonthlyReportEmails({
      emails: body?.emails,
    });
    const scope =
      body?.emails && body.emails.length > 0
        ? ` for ${body.emails.length} user(s)`
        : '';
    return {
      success: true,
      message: `Monthly Report Email job has been triggered${scope}`,
    };
  }

  @Post('trigger-weekly-report')
  @ApiOperation({ summary: 'Manually trigger Weekly Report Email job' })
  async triggerWeeklyReport() {
    await this.reportEmailJobService.handleWeeklyReportEmails();
    return {
      success: true,
      message: 'Weekly Report Email job has been triggered',
    };
  }
}
