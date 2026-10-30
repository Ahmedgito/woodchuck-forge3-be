import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from 'src/roles/infrastructure/persistence/relational/entities/role.entity';
import { RoleEnum } from 'src/roles/roles.enum';
import { Repository } from 'typeorm';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private repository: Repository<RoleEntity>,
  ) {}

  async run() {
    const countGeneralContractor = await this.repository.count({
      where: {
        id: RoleEnum.general_contractor,
      },
    });

    if (!countGeneralContractor) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.general_contractor,
          name: 'General Contractor',
        }),
      );
    }

    const countAdmin = await this.repository.count({
      where: {
        id: RoleEnum.admin,
      },
    });

    if (!countAdmin) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.admin,
          name: 'Admin',
        }),
      );
    }

    const countPowerPlant = await this.repository.count({
      where: {
        id: RoleEnum.power_plant,
      },
    });

    if (!countPowerPlant) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.power_plant,
          name: 'Power Plant',
        }),
      );
    }

    const countEndClient = await this.repository.count({
      where: {
        id: RoleEnum.end_client,
      },
    });

    if (!countEndClient) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.end_client,
          name: 'End Client',
        }),
      );
    }

    const countManufacturer = await this.repository.count({
      where: {
        id: RoleEnum.manufacturer,
      },
    });

    if (!countManufacturer) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.manufacturer,
          name: 'Manufacturer',
        }),
      );
    }

    const countOfftake = await this.repository.count({
      where: {
        id: RoleEnum.wood_processing,
      },
    });

    if (!countOfftake) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.wood_processing,
          name: 'Wood Processing',
        }),
      );
    }
  }
}
