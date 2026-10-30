import { GlobalData } from '../../../../domain/global-data';
import { GlobalDataEntity } from '../entities/global-data.entity';

export class GlobalDataMapper {
  static toDomain(raw: GlobalDataEntity): GlobalData {
    const globalData = new GlobalData();
    globalData.id = raw.id;
    globalData.distanceMmrMacomb = raw.distanceMmrMacomb;
    globalData.distanceMmrLivonia = raw.distanceMmrLivonia;
    globalData.tonage10yrd = raw.tonage10yrd;
    globalData.tonage20yrd = raw.tonage20yrd;
    globalData.tonage30yrd = raw.tonage30yrd;
    globalData.tonage40yrd = raw.tonage40yrd;
    globalData.supervisorOnboarding = raw.supervisorOnboarding;
    globalData.autoResponse = raw.autoResponse;

    return globalData;
  }

  static toPersistence(globalData: GlobalData): GlobalDataEntity {
    const globalDataEntity = new GlobalDataEntity();
    if (globalData.id && typeof globalData.id === 'number') {
      globalDataEntity.id = globalData.id;
    }

    globalDataEntity.distanceMmrMacomb = globalData.distanceMmrMacomb;
    globalDataEntity.distanceMmrLivonia = globalData.distanceMmrLivonia;
    globalDataEntity.tonage10yrd = globalData.tonage10yrd;
    globalDataEntity.tonage20yrd = globalData.tonage20yrd;
    globalDataEntity.tonage30yrd = globalData.tonage30yrd;
    globalDataEntity.tonage40yrd = globalData.tonage40yrd;
    globalDataEntity.supervisorOnboarding = globalData.supervisorOnboarding;
    globalDataEntity.autoResponse = globalData.autoResponse;

    return globalDataEntity;
  }
}
