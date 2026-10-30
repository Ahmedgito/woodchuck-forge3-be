import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from 'src/roles/roles.enum';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
  ) {}

  async run() {
    const countAdmin = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.admin,
        },
      },
    });

    if (!countAdmin) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      await this.repository.save(
        this.repository.create({
          name: 'Super',
          //lastName: 'Admin',
          email: 'admin@example.com',
          password,
          role: {
            id: RoleEnum.admin,
            name: 'Admin',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );
    }

    const countUser = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.general_contractor,
        },
      },
    });

    if (!countUser) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      await this.repository.save(
        this.repository.create({
          name: 'John',
          // lastName: 'Doe',
          email: 'john.doe@example.com',
          password,
          role: {
            id: RoleEnum.general_contractor,
            name: 'General Contracter',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );
    }

    const countPowerPlant = await this.repository.count({
      where: {
        role: {
          id: RoleEnum.power_plant,
        },
      },
    });

    if (!countPowerPlant) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      await this.repository.save(
        this.repository.create({
          name: 'Power Plant',
          //lastName: 'Admin',
          email: 'powerplant@example.com',
          password,
          role: {
            id: RoleEnum.power_plant,
            name: 'Power Plant',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );
    }

    const co2trueUser = await this.repository.findOne({
      where: { isApiOnly: true },
    });

    if (!co2trueUser) {
      await this.repository.save(
        this.repository.create({
          name: 'CO2True Integration',
          role: {
            id: RoleEnum.admin,
            name: 'Admin',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
          isApiOnly: true,
        }),
      );
    }
  }
}
