import { Injectable } from '@nestjs/common';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { NullableType } from '../utils/types/nullable.type';
import { GlobalDataRepository } from './infrastructure/persistence/global-data.repository';
import { DeepPartial } from 'src/utils/types/deep-partial.type';
import { GlobalData } from './domain/global-data';

@Injectable()
export class GlobalDataService {
  constructor(
    private readonly globalDataRepository: GlobalDataRepository,
    // private readonly filesService: FilesService,
  ) {}

  findOne(
    fields: EntityCondition<GlobalData>,
  ): Promise<NullableType<GlobalData>> {
    return this.globalDataRepository.findOne(fields);
  }

  async update(
    id: GlobalData['id'],
    payload: DeepPartial<GlobalData>,
  ): Promise<GlobalData | null> {
    const clonedPayload = { ...payload };

    return this.globalDataRepository.update(id, clonedPayload);
  }
}
