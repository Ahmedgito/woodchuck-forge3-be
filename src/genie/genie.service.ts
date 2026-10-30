import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genie } from './domain/genie';
import { GenieEntity } from './infrastructure/persistence/relational/entities/genie.entity';

export type GeniePayload = Pick<Genie, 'value' | 'description'>;

@Injectable()
export class GenieService {
  constructor(
    @InjectRepository(GenieEntity)
    private readonly genieRepository: Repository<GenieEntity>,
  ) {}

  findAll(): Promise<GeniePayload[]> {
    return this.genieRepository.find({
      select: {
        value: true,
        description: true,
      },
      order: { value: 'ASC' },
    });
  }

  findByValue(value: string): Promise<GeniePayload | null> {
    return this.genieRepository.findOne({
      select: {
        value: true,
        description: true,
      },
      where: { value },
    });
  }
}
