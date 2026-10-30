import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientReportConfigService } from './client-report-config.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { ToggleClientConfigDto } from './dto/toggle-client-config.dto';

@Controller({ path: 'client-report-config', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.admin, RoleEnum.cms)
export class ClientReportConfigController {
  constructor(
    private readonly clientReportConfigService: ClientReportConfigService,
  ) {}

  @Get()
  async getAll() {
    return this.clientReportConfigService.getAllEnabledClients();
  }

  @Get(':clientId')
  async getByClientId(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.clientReportConfigService.findByClientId(clientId);
  }

  @Get(':clientId/enabled')
  async isEnabled(@Param('clientId', ParseIntPipe) clientId: number) {
    const enabled = await this.clientReportConfigService.isEnabled(clientId);
    return { clientId, enabled };
  }

  @Post('enable')
  async enable(@Body() dto: ToggleClientConfigDto) {
    return this.clientReportConfigService.enable(dto.clientId);
  }

  @Post('disable')
  async disable(@Body() dto: ToggleClientConfigDto) {
    return this.clientReportConfigService.disable(dto.clientId);
  }

  @Put('toggle')
  async toggle(@Body() dto: ToggleClientConfigDto) {
    return this.clientReportConfigService.toggle(dto.clientId);
  }

  @Post('generate-report/:clientId')
  async generateReport(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.clientReportConfigService.generateReport(clientId);
  }

  @Post('send-report/:clientId')
  async sendCumulativeReport(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.clientReportConfigService.sendCumulativeReport(clientId, asOfDate);
  }
}
