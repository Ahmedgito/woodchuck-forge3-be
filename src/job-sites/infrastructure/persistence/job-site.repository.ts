import { JobSite } from '../../domain/job-site';
import { NullableType } from 'src/utils/types/nullable.type';
// import { FilterJobSiteDto, SortJobSiteDto } from '../../dto/query-job-site.dto';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { DeepPartial } from 'src/utils/types/deep-partial.type';
import {
  FilterJobSiteDto,
  SortJobSiteDto,
} from 'src/job-sites/dto/query-job-site.dto';

export abstract class JobSiteRepository {
  abstract create(
    data: Omit<JobSite, 'id' | 'createdAt' | 'closedAt' | 'updatedAt'>,
  ): Promise<JobSite>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterJobSiteDto | null;
    sortOptions?: SortJobSiteDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<JobSite[]>;

  abstract findOne(
    fields: EntityCondition<JobSite>,
    filters?: FilterJobSiteDto | null,
  ): Promise<NullableType<JobSite>>;

  abstract update(
    id: JobSite['id'],
    payload: DeepPartial<JobSite>,
  ): Promise<JobSite | null>;

  abstract softDelete(id: JobSite['id']): Promise<void>;

  abstract findAll(where: Partial<JobSite>): Promise<JobSite[]>;
}
