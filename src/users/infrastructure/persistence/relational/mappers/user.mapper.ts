import { RoleEntity } from 'src/roles/infrastructure/persistence/relational/entities/role.entity';
import { User } from '../../../../domain/user';
import { UserEntity } from '../entities/user.entity';
import { StatusEntity } from 'src/statuses/infrastructure/persistence/relational/entities/status.entity';

export class UserMapper {
  static toDomain(raw: UserEntity): User {
    const user = new User();
    user.id = raw.id;
    user.email = raw.email;
    user.password = raw.password;
    user.previousPassword = raw.previousPassword;
    user.provider = raw.provider;
    user.socialId = raw.socialId;
    user.name = raw.name;
    user.phone = raw.phone;
    user.photo = raw.photo;
    user.username = raw.username;
    user.company = raw.company;
    user.billing_details_city = raw.billing_details_city;
    user.billing_details_country = raw.billing_details_country;
    user.billing_details_name = raw.billing_details_name;
    user.billing_details_state = raw.billing_details_state;
    user.billing_details_street = raw.billing_details_street;
    user.billing_details_zipcode = raw.billing_details_zipcode;
    user.role = raw.role;
    user.status = raw.status;
    user.createdAt = raw.createdAt;
    user.updatedAt = raw.updatedAt;
    user.deletedAt = raw.deletedAt;
    user['jobSite'] = raw.jobSite;
    user.demo = raw.demo ?? false;
    user.isSubUser = raw.isSubUser ?? false;
    user.parentUserId = raw.parentUserId ?? null;
    return user;
  }

  static toPersistence(user: User): UserEntity {
    let role: RoleEntity | undefined = undefined;

    if (user.role) {
      role = new RoleEntity();
      role.id = user.role.id;
    }

    // let photo: FileEntity | undefined = undefined;

    // if (user.photo) {
    //   photo = new FileEntity();
    //   photo.id = user.photo.id;
    // }

    let status: StatusEntity | undefined = undefined;
    if (user.status) {
      status = new StatusEntity();
      status.id = user.status.id;
    }

    const userEntity = new UserEntity();
    if (user.id && typeof user.id === 'number') {
      userEntity.id = user.id;
    }
    userEntity.email = user.email ? user.email : null;
    userEntity.password = user.password;
    userEntity.previousPassword = user.previousPassword;
    userEntity.provider = user.provider;
    userEntity.socialId = user.socialId;
    userEntity.name = user.name;
    userEntity.company = user.company;
    userEntity.phone = user.phone;
    userEntity.username = user.username;
    userEntity.photo = user.photo;

    userEntity.billing_details_city = user.billing_details_city
      ? user.billing_details_city
      : null;
    userEntity.billing_details_country = user.billing_details_country
      ? user.billing_details_country
      : null;
    userEntity.billing_details_name = user.billing_details_name
      ? user.billing_details_name
      : null;
    userEntity.billing_details_state = user.billing_details_state
      ? user.billing_details_state
      : null;
    userEntity.billing_details_street = user.billing_details_street
      ? user.billing_details_street
      : null;
    userEntity.billing_details_zipcode = user.billing_details_zipcode
      ? user.billing_details_zipcode
      : null;

    userEntity.role = role;
    userEntity.status = status;
    userEntity.createdAt = user.createdAt;
    userEntity.updatedAt = user.updatedAt;
    userEntity.deletedAt = user.deletedAt;
    userEntity.demo = user.demo ?? false;
    userEntity.isSubUser = user.isSubUser ?? false;
    userEntity.parentUserId = user.parentUserId ?? null;
    return userEntity;
  }
}
