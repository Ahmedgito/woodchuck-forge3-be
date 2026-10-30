import { GlobalData } from '../../domain/global-data';
import { NullableType } from 'src/utils/types/nullable.type';
// import { FilterJobSiteDto, SortJobSiteDto } from '../../dto/query-job-site.dto';
// import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { DeepPartial } from 'src/utils/types/deep-partial.type';

export abstract class GlobalDataRepository {
  abstract create(data: Omit<GlobalData, 'id'>): Promise<GlobalData>;

  abstract findOne(
    fields: EntityCondition<GlobalData>,
  ): Promise<NullableType<GlobalData>>;

  abstract update(
    id: GlobalData['id'],
    payload: DeepPartial<GlobalData>,
  ): Promise<GlobalData | null>;
}
