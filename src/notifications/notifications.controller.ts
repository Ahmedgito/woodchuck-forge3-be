import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { InfinityPaginationResultType } from 'src/utils/types/infinity-pagination-result.type';
import { Notification } from './domain/notification';
import { infinityPagination } from 'src/utils/infinity-pagination';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';

@Roles(RoleEnum.admin, RoleEnum.power_plant)
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SerializeOptions({
  groups: ['admin'],
})
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Query() query: QueryNotificationDto,
  ): Promise<InfinityPaginationResultType<Notification>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.notificationsService.findManyWithPagination({
        filterOptions: query?.filters,
        sortOptions: query?.sort,
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Patch('read/:id')
  read(@Param('id') id: string) {
    return this.notificationsService.read(id);
  }
}
