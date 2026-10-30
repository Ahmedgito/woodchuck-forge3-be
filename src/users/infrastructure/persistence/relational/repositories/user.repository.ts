import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from '../../../../dto/query-user.dto';
import { User } from '../../../../domain/user';
import { UserRepository } from '../../user.repository';
import { UserMapper } from '../mappers/user.mapper';
import { StatusEntity } from 'src/statuses/infrastructure/persistence/relational/entities/status.entity';
import { StatusEnum } from 'src/statuses/statuses.enum';

@Injectable()
export class UsersRelationalRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(data: User): Promise<User> {
    const persistenceModel = UserMapper.toPersistence(data);
    const newEntity = await this.usersRepository.save(
      this.usersRepository.create(persistenceModel),
    );
    return UserMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    const where: FindOptionsWhere<UserEntity> = {};

    where.isSubUser = false; // Default to false, can be overridden by filterOptions

    if (filterOptions?.roles != undefined) {
      const roleId: any[] = filterOptions.roles?.map((role) => role.id) ?? [];
      where.role = { id: In(roleId) };
    }

    if (filterOptions?.search != undefined) {
      // const  roleCondition = { role: { id: RoleEnum.general_contractor } };

      // const searchCondition = [
      //   { name: ILike('%' + filterOptions.search + '%') },
      //   { username: ILike('%' + filterOptions.search + '%') },
      // ];
      where.name = ILike('%' + filterOptions.search + '%');
      where.username = ILike('%' + filterOptions.search + '%');

      // if (where.length > 0) {
      //   where = where
      //     .map((condition) => {
      //       return searchCondition.map((sc) => ({
      //         ...condition,
      //         ...sc,
      //       }));

      //       return condition;
      //     })
      //     .flat();
      // } else {
      //   where = searchCondition.map((sc) => ({
      //     ...roleCondition,
      //     ...sc,
      //   }));
      // }
    }

    if (filterOptions?.subUser) {
      where.parentUserId = filterOptions?.parentUserId ?? undefined;
      where.isSubUser = true;
    }

    if (filterOptions?.endClientId) {
      where.jobSite = {
        endClientId: filterOptions.endClientId, // Filter users whose job sites have the specified clientId
      };
    }

    const entities = await this.usersRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      // ...(filterOptions?.search != undefined && { relations: ['jobSite'] }),
      // where: where.length > 0 ? where : undefined,
      where: where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy]: sort.order,
        }),
        {},
      ),
      relations: ['jobSite'],
    });

    const response = entities.map((user) => UserMapper.toDomain(user));
    return response;
  }

  async findOne(fields: EntityCondition<User>): Promise<NullableType<User>> {
    const entity = await this.usersRepository.findOne({
      where: fields as FindOptionsWhere<UserEntity>,
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async update(id: User['id'], payload: Partial<User>): Promise<User> {
    const entity = await this.usersRepository.findOne({
      where: { id: Number(id) },
    });

    if (!entity) {
      throw new Error('User not found');
    }

    const updatedEntity = await this.usersRepository.save(
      this.usersRepository.create(
        UserMapper.toPersistence({
          ...UserMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return UserMapper.toDomain(updatedEntity);
  }

  async softDelete(id: User['id']): Promise<void> {
    // await this.usersRepository.softDelete(id);
    const statusObj = new StatusEntity();
    statusObj.id = StatusEnum.inactive;
    const clonedPayload = {
      deletedAt: new Date(),
      status: statusObj,
    };
    await this.usersRepository.update(id, { ...clonedPayload });
  }

  async find(fields: EntityCondition<User>): Promise<User[]> {
    const entities = await this.usersRepository.find({
      where: fields as FindOptionsWhere<UserEntity>,
    });

    return entities.map((user) => UserMapper.toDomain(user));
  }
}
