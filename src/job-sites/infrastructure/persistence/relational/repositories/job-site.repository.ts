import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { FindOptionsWhere, Repository } from 'typeorm';
import { JobSiteEntity } from '../entities/job-site.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
// import { FilterUserDto, SortUserDto } from '../../../../dto/query-job-site.dto';
import { JobSiteRepository } from '../../job-site.repository';
// import { JobSite } from 'src/job-sites/domain/job-site';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { StatusEntity } from 'src/statuses/infrastructure/persistence/relational/entities/status.entity';
import {
  FilterJobSiteDto,
  SortJobSiteDto,
} from 'src/job-sites/dto/query-job-site.dto';
import { JobSite } from 'src/job-sites/domain/job-site';
import { JobSiteMapper } from '../mappers/job-site.mapper';

@Injectable()
export class JobSitesRelationalRepository implements JobSiteRepository {
  constructor(
    @InjectRepository(JobSiteEntity)
    private readonly jobSitesRepository: Repository<JobSiteEntity>,
  ) {}

  async create(data: JobSite): Promise<JobSite> {
    const persistenceModel = JobSiteMapper.toPersistence(data);
    const newEntity = await this.jobSitesRepository.save(
      this.jobSitesRepository.create(persistenceModel),
    );
    return JobSiteMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterJobSiteDto | null;
    sortOptions?: SortJobSiteDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<any[]> {
    const where: FindOptionsWhere<JobSiteEntity> = {};
    if (filterOptions?.clientId != null) {
      where.client = { id: filterOptions.clientId };
    }
    if (filterOptions?.endClientId != null) {
      where.endClientId = filterOptions.endClientId;
    }
    const entities = await this.jobSitesRepository.find({
      relations: { dumpsters: true, jobSiteDetails: true, client: true },
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

    return Promise.all(entities.map((user) => JobSiteMapper.toDomain(user)));
  }

  async findOne(
    fields: EntityCondition<JobSite>,
    filterOptions?: FilterJobSiteDto | null,
  ): Promise<NullableType<JobSite>> {
    const where = fields as FindOptionsWhere<JobSiteEntity>;
    if (filterOptions?.clientId != null) {
      where.client = { id: filterOptions.clientId };
    }
    const entity = await this.jobSitesRepository.findOne({
      relations: { dumpsters: true, jobSiteDetails: true, client: true },
      where: where,
    });

    return entity ? JobSiteMapper.toDomain(entity) : null;
  }

  async update(id: JobSite['id'], payload: Partial<JobSite>): Promise<JobSite> {
    const entity = await this.jobSitesRepository.findOne({
      where: { id: Number(id) },
    });

    if (!entity) {
      throw new Error('Job Site not found');
    }

    const toDomain = await JobSiteMapper.toDomain(entity);
    const updatedEntity = await this.jobSitesRepository.save(
      this.jobSitesRepository.create(
        JobSiteMapper.toPersistence(
          await {
            ...toDomain,
            ...payload,
          },
        ),
      ),
    );

    return JobSiteMapper.toDomain(updatedEntity);
  }

  async softDelete(id: JobSite['id']): Promise<void> {
    // await this.jobSitesRepository.softDelete(id);
    // eslint-disable-next-line prefer-const
    let statusObj = new StatusEntity();
    statusObj.id = StatusEnum.inactive;
    await this.jobSitesRepository.update(
      {
        id,
      },
      {
        closedAt: new Date(),
        status: statusObj,
      },
    );
  }

  async findAll(where: Partial<JobSite>): Promise<JobSite[]> {
    // Convert domain where to persistence where
    const persistenceWhere: FindOptionsWhere<JobSiteEntity> = {};
    if (where.clientId) {
      // Ensure clientId is a number for the entity
      const clientIdNum =
        typeof where.clientId === 'string'
          ? parseInt(where.clientId, 10)
          : where.clientId;
      persistenceWhere.client = { id: clientIdNum };
    }
    if (where.id) {
      persistenceWhere.id = where.id;
    }
    // Add more mappings as needed
    const entities = await this.jobSitesRepository.find({
      // relations: { jobSiteDetails: true, client: true },
      where: persistenceWhere,
    });
    // Await all domain mappings
    return Promise.all(entities.map(JobSiteMapper.toDomain));
  }
}
