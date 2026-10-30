import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { FindOptionsWhere, Repository } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';

import { ReportSubscriptionsEntity } from '../entities/report-subscriptions.entity';
import { ReportSubscriptionsRepository } from '../../report-subscriptions.repository';

@Injectable()
export class ReportSubscriptionsRelationalRepository
  implements ReportSubscriptionsRepository
{
  constructor(
    @InjectRepository(ReportSubscriptionsEntity)
    private reportSubscriptionsRepository: Repository<ReportSubscriptionsEntity>,
  ) {}

  async findOne(
    fields: EntityCondition<ReportSubscriptionsEntity>,
  ): Promise<NullableType<ReportSubscriptionsEntity>> {
    const where = fields as FindOptionsWhere<ReportSubscriptionsEntity>;
    const subscription = await this.reportSubscriptionsRepository.findOne({
      where: where,
    });

    return subscription;
  }
}
