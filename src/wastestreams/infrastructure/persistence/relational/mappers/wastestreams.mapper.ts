import { WasteStreamsEntity } from '../entities/wastestreams.entity';

export class WasteStreamMapper {
  static toResponse(data: WasteStreamsEntity[]) {
    return data.map((wasteStream) => {
      return {
        ...wasteStream,
        wasteStreamTypes: wasteStream.wasteStreamTypes.map((type) => ({
          ...type,
          vesselIds: type.vessels.map((v) => v.vesselId),
        })),
      };
    });
  }
}
