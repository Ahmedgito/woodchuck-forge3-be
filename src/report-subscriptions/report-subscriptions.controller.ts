import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { RolesGuard } from 'src/roles/roles.guard';
import { ReportSubscriptionsService } from './report-subscriptions.service';
import { ToggleSubscriptionDto } from './dto/toggle-subscription.dto';
import { Request } from 'express';
import { User } from 'src/users/domain/user';

@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
  RoleEnum.cms,
)
@ApiTags('Report Subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin', 'cms', 'general_contractor', 'manufacturer', 'wood_processing', 'end_client'],
})
@Controller({ path: 'report-subscriptions', version: '1' })
export class ReportSubscriptionsController {
  constructor(
    private readonly reportSubscriptionsService: ReportSubscriptionsService,
  ) {}

  @ApiOperation({
    summary: 'Toggle report subscription',
    description:
      'Activate or deactivate a report subscription. Monthly and weekly may both be active for the same report.',
  })
  @ApiBody({ type: ToggleSubscriptionDto })
  @Post('toggle')
  async toggle(@Body() dto: ToggleSubscriptionDto, @Req() req: Request) {
    const userId = (req.user as User).id;
    return await this.reportSubscriptionsService.toggleSubscription(
      dto,
      userId,
    );
  }

  @ApiOperation({
    summary: 'Get user subscriptions',
    description: 'Get all report subscriptions for the current user',
  })
  @Get('/')
  async findByUser(@Req() req: Request) {
    const userId = (req.user as User).id;
    return await this.reportSubscriptionsService.findByUser(userId);
  }
}
