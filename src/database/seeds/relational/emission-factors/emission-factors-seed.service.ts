import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmissionFactorEntity } from 'src/emission-factors/infrastructure/persistence/relational/entities/emission-factor.entity';

@Injectable()
export class EmissionFactorsSeedService {
  constructor(
    @InjectRepository(EmissionFactorEntity)
    private repository: Repository<EmissionFactorEntity>,
  ) {}

  async run() {
    const count = await this.repository.count();

    if (count === 0) {
      await this.repository.save([
        this.repository.create({
          name: 'CO2 Avoided',
          key: 'co2_avoided',
          value: '0.4',
        }),
      ]);
    }
  }
}
