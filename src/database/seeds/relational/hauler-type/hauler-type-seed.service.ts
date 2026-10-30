import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HaulerTypeEntity } from 'src/haulertype/infrastructure/persistence/relational/entities/haulertype.entity';
import { Repository } from 'typeorm';
@Injectable()
export class HaulerTypeSeedService {
  constructor(
    @InjectRepository(HaulerTypeEntity)
    private repository: Repository<HaulerTypeEntity>,
  ) {}
  async run() {
    const count = await this.repository.count();
    const haulerTypes = [
      { name: 'Diesel trucks', unit: '253g CO2/ton-mile' },
      { name: 'Rail', unit: '27g CO2/ton-mile' },
      { name: 'Domestic Water Transportation', unit: '41g CO2/ton-mile' },
    ];
    if (count === 0) {
      haulerTypes.forEach(async (value) => {
        try {
          const type = await this.repository.create(value);
          console.log(type);
          await this.repository.save(type);
        } catch (exceptions) {
          console.log(exceptions.message);
        }
      });
    }
  }
}
