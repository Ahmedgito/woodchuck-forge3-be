import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WasteStreamActivityMappingEntity } from './infrastructure/persistence/relational/entities/waste-stream-activity-mapping.entity';
import { WasteStreamActivityMapping } from './domain/waste-stream-activity-mapping';

@Injectable()
export class WasteStreamActivityMappingService {
  constructor(
    @InjectRepository(WasteStreamActivityMappingEntity)
    private wasteStreamActivityMappingRepository: Repository<WasteStreamActivityMappingEntity>,
  ) {}

  async findByWasteStreamName(
    wasteStreamName: string,
  ): Promise<WasteStreamActivityMapping | null> {
    return this.wasteStreamActivityMappingRepository.findOne({
      where: { wasteStreamName },
    });
  }

  async getActivity(wasteStreamName: string): Promise<string> {
    const mapping = await this.findByWasteStreamName(wasteStreamName);
    if (mapping) {
      return mapping.activity;
    }

    // Fallback to default mappings if not found in database
    const defaultMappings: Record<string, string> = {
      'WOOD WASTE': 'Biomass',
      METAL: 'Recycled',
      PLASTIC: 'Recycled',
      CONCRETE: 'Recycled',
      'WASTE HAULING + LANDFILL': 'Non-Recycled',
    };

    return defaultMappings[wasteStreamName] || 'Unknown';
  }

  async getAll(): Promise<WasteStreamActivityMapping[]> {
    return this.wasteStreamActivityMappingRepository.find();
  }

  async create(
    wasteStreamName: string,
    activity: string,
  ): Promise<WasteStreamActivityMapping> {
    const mapping = this.wasteStreamActivityMappingRepository.create({
      wasteStreamName,
      activity,
    });
    return this.wasteStreamActivityMappingRepository.save(mapping);
  }

  async update(
    wasteStreamName: string,
    activity: string,
  ): Promise<WasteStreamActivityMapping> {
    const mapping = await this.findByWasteStreamName(wasteStreamName);
    if (!mapping) {
      throw new Error(
        `Mapping for waste stream ${wasteStreamName} not found`,
      );
    }

    mapping.activity = activity;
    return this.wasteStreamActivityMappingRepository.save(mapping);
  }
}
