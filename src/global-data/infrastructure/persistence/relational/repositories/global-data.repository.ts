import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
// import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { FindOptionsWhere, Repository } from 'typeorm';
import { GlobalDataEntity } from '../entities/global-data.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
// import { FilterUserDto, SortUserDto } from '../../../../dto/query-job-site.dto';
import { GlobalData } from '../../../../domain/global-data';
import { GlobalDataRepository } from '../../global-data.repository';
import { GlobalDataMapper } from '../mappers/global-data.mapper';
import { QueuesService } from 'src/queues/queues.service';
// import { JobSite } from 'src/job-sites/domain/job-site';

@Injectable()
export class GlobalDataRelationalRepository implements GlobalDataRepository {
  constructor(
    @InjectRepository(GlobalDataEntity)
    private readonly globalDataRepository: Repository<GlobalDataEntity>,
    private readonly queueService: QueuesService,
  ) {}

  async create(data: GlobalData): Promise<GlobalData> {
    const persistenceModel = GlobalDataMapper.toPersistence(data);
    const newEntity = await this.globalDataRepository.save(
      this.globalDataRepository.create(persistenceModel),
    );
    return GlobalDataMapper.toDomain(newEntity);
  }

  async findOne(
    fields: EntityCondition<GlobalData>,
  ): Promise<NullableType<GlobalData>> {
    const entity = await this.globalDataRepository.findOne({
      where: fields as FindOptionsWhere<GlobalDataEntity>,
    });

    return entity ? GlobalDataMapper.toDomain(entity) : null;
  }

  async update(
    id: GlobalData['id'],
    payload: Partial<GlobalData>,
  ): Promise<GlobalData> {
    const entity = await this.globalDataRepository.findOne({
      where: { id: Number(id) },
    });

    if (!entity) {
      throw new Error('Global not not found');
    }

    const updatedEntity = await this.globalDataRepository.save(
      this.globalDataRepository.create(
        GlobalDataMapper.toPersistence({
          ...GlobalDataMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );
    void this.queueService.globalDataUpdate({});
    return GlobalDataMapper.toDomain(updatedEntity);
  }
}
