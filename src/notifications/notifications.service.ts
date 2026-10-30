import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  FilterNotificationDto,
  SortNotificationDto,
} from './dto/query-notification.dto';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { NotificationEntity } from './infrastructure/persistence/relational/entities/notification.entity';
import {
  FindOptionsWhere,
  JsonContains,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './domain/notification';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(SmsDumpsterEntity)
    private smsDumpsterRepository: Repository<SmsDumpsterEntity>,
  ) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(createNotificationDto: CreateNotificationDto) {
    return 'This action adds a new notification';
  }

  findAll() {
    return `This action returns all notifications`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notification`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async read(id: Notification['id']) {
    return await this.notificationRepository.update(
      { id: id },
      { isRead: true },
    );
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterNotificationDto | null;
    sortOptions?: SortNotificationDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Notification[]> {
    const where: FindOptionsWhere<NotificationEntity> = {};
    if (filterOptions?.lastcreated != null) {
      where.createdAt = LessThanOrEqual(filterOptions.lastcreated);
    }
    if (filterOptions?.jobSiteId != null || filterOptions?.status != null) {
      where.data = JsonContains({
        ...(filterOptions?.status !== null && {
          jobSiteId: filterOptions.jobSiteId,
        }),
        ...(filterOptions?.status !== null && {
          status: filterOptions.status,
        }),
      });
    }

    const entities = await this.notificationRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy]: sort.order,
        }),
        {},
      ),
    });

    return entities.map((notification) => notification);
  }
}
