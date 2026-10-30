// report-subscription.repository.ts
import { Injectable } from '@nestjs/common';
import { ReportSubscription } from 'src/report-subscriptions/domain/report-subscriptions';
import { EntityCondition } from 'src/utils/types/entity-condition.type';

@Injectable()
export abstract class ReportSubscriptionsRepository {
  abstract findOne(
    fields: EntityCondition<ReportSubscription>,
  ): Promise<ReportSubscription | null>;
}
