import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { IPaginationOptions } from 'src/utils/types/pagination-options';
import { CreateUserDto } from './dto/create-user.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { DeepPartial } from 'src/utils/types/deep-partial.type';
import { User } from './domain/user';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { RoleEnum } from 'src/roles/roles.enum';
import { FilesService } from 'src/files/files.service';
import { FilesS3PresignedService } from 'src/files/infrastructure/uploader/s3-presigned/files.service';
import bcrypt from 'bcryptjs';
import { AuthProvidersEnum } from 'src/auth/auth-providers.enum';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { ApiKeyService } from 'src/api-key/api-key.service';
import { SessionService } from 'src/session/session.service';
import { RefreshAccountCodeDto } from './dto/refresh-account-code.dto';
import { CreateSubUserDto } from './dto/create-sub-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
    private readonly filesS3PresignedService: FilesS3PresignedService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly sessionService: SessionService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async create(
    createProfileDto: CreateUserDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    const isDemo = this.configService.getOrThrow('app.isDemo', { infer: true });
    const clonedPayload: any = {
      provider: AuthProvidersEnum.email,
      demo: isDemo,
      ...createProfileDto,
    };

    if (clonedPayload.password) {
      const salt = await bcrypt.genSalt();
      clonedPayload.password = await bcrypt.hash(clonedPayload.password, salt);
    }

    if (clonedPayload.email) {
      const userObject = await this.usersRepository.findOne({
        email: clonedPayload.email,
      });
      if (userObject) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              email: 'emailAlreadyExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
    if (clonedPayload.role?.id) {
      const roleObject = Object.values(RoleEnum).includes(
        clonedPayload.role.id,
      );
      if (!roleObject) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              role: 'roleNotExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    clonedPayload.status = { id: StatusEnum.inactive };
    const userCreated = await this.usersRepository.create(clonedPayload);

    // Generate per-user API key
    try {
      await this.apiKeyService.generateAndStoreKey(Number(userCreated.id));
    } catch (e) {
      this.logger.error('Failed to generate API key for user', e);
    }

    // Handle file upload
    if (file) {
      try {
        const publicUrl = await this.filesS3PresignedService.uploadUserPhoto(
          userCreated.id,
          file,
        );
        await this.usersRepository.update(userCreated.id, { photo: publicUrl });
      } catch (error) {
        this.logger.error('Failed to upload user photo:', error);
        // Continue without photo rather than failing the entire user creation
        clonedPayload.photo = null;
      }
    }

    await this.verificationCode(userCreated);

    return userCreated;
  }

  async createUser(createProfileDto: CreateUserDto): Promise<User> {
    const isDemo = this.configService.getOrThrow('app.isDemo', { infer: true });

    const clonedPayload = {
      provider: AuthProvidersEnum.email,
      demo: isDemo,
      status: { id: StatusEnum.inactive },
      ...createProfileDto,
    };

    try {
      if (clonedPayload.email) {
        const existingUser = await this.usersRepository.findOne({
          email: clonedPayload.email,
        });
        if (existingUser) {
          throw new HttpException(
            {
              status: HttpStatus.UNPROCESSABLE_ENTITY,
              errors: { email: 'emailAlreadyExists' },
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
      }

      const userCreated = await this.usersRepository.create(clonedPayload);
      // Generate per-user API key
      try {
        await this.apiKeyService.generateAndStoreKey(Number(userCreated.id));
      } catch (e) {
        this.logger.error('Failed to generate API key for user', e);
      }
      await this.verificationCode(userCreated);

      return userCreated;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMapping: Record<
        string,
        { status: HttpStatus; message: string }
      > = {
        ValidationError: {
          status: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
        },
        DatabaseError: {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
        },
      };

      const { status, message } = errorMapping[error.name] || {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create user',
      };

      throw new HttpException(
        { status, errors: { message, details: error.message } },
        status,
      );
    }
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findOne(fields: EntityCondition<User>): Promise<NullableType<User>> {
    return this.usersRepository.findOne(fields);
  }

  find(fields: EntityCondition<User>): Promise<User[]> {
    return this.usersRepository.find(fields);
  }

  async update(
    id: User['id'],
    payload: DeepPartial<User>,
    sendEmail: boolean = true,
    file?: Express.Multer.File,
  ): Promise<User | null> {
    const clonedPayload: any = { ...payload };

    if (
      clonedPayload.password &&
      clonedPayload.previousPassword !== clonedPayload.password
    ) {
      const salt = await bcrypt.genSalt();
      clonedPayload.password = await bcrypt.hash(clonedPayload.password, salt);
    }

    if (clonedPayload.role?.id) {
      const roleObject = Object.values(RoleEnum).includes(
        clonedPayload.role.id,
      );
      if (!roleObject) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              role: 'roleNotExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    if (clonedPayload.status?.id) {
      const statusObject = Object.values(StatusEnum).includes(
        clonedPayload.status.id,
      );
      if (!statusObject) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              status: 'statusNotExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    // If user already has a photo, delete it from S3 first
    const user = await this.usersRepository.findOne({ id });

    // Handle photo removal (user had photo, now wants to remove it)
    if (user?.photo && !clonedPayload.photo && !file) {
      await this.filesS3PresignedService.deleteUserPhoto(id, user.photo);
      clonedPayload.photo = null;
    }

    // Handle file upload if present
    if (file) {
      try {
        const publicUrl = await this.filesS3PresignedService.uploadUserPhoto(
          id,
          file,
        );
        clonedPayload.photo = publicUrl;
        // Only delete old photo if there was one
        if (user?.photo) {
          await this.filesS3PresignedService.deleteUserPhoto(id, user.photo);
        }
      } catch (error) {
        this.logger.error('Failed to upload user photo during update:', error);
        // Continue without photo rather than failing the entire user update
      }
    }

    const resp = await this.usersRepository.update(id, clonedPayload);

    if (clonedPayload.email && sendEmail) {
      const userObject = await this.usersRepository.findOne({
        email: clonedPayload.email,
      });
      await this.verificationCode(userObject);
      /*
      if (userObject?.id !== id) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              email: 'emailAlreadyExists',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      */
    }

    return resp;
  }

  async softDelete(id: User['id']): Promise<void> {
    await this.usersRepository.softDelete(id);
  }

  async verifyAccount(hash: string, password: string) {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        verifyaccount: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.verifyaccount;
    } catch {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            hash: `invalidHash`,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const user = await this.findOne({
      id: userId,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            hash: `notFound`,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    user.password = password;
    user.status = { id: StatusEnum.active };

    await this.sessionService.softDelete({
      user: {
        id: user.id,
      },
    });

    await this.update(user.id, user, false);
    // Generate short-lived auto-login token (5 minutes) to match reset-password flow
    const autoLoginToken = await this.jwtService.signAsync(
      {
        userId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.secret', {
          infer: true,
        }),
        expiresIn: '5m',
      },
    );

    return { message: 'Account activated', name: user.name, autoLoginToken };
  }

  async confirmEmailVerify(hash: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        verifyaccount: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId = jwtData.verifyaccount;
    } catch {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            hash: `invalidHash`,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    /*
    const user = await this.findOne({
      id: userId,
    });

    if (user && user.password) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `user exists`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    */
  }

  async refreshCode(refreshAccountCodeDto: RefreshAccountCodeDto) {
    const user = await this.findOne({
      email: refreshAccountCodeDto.email,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            hash: `notFound`,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.status?.id == StatusEnum.active) {
      return { messagge: 'Already activated' };
    }

    const hash = await this.verificationCode(user);

    return hash;
  }

  async verificationCode(userCreated) {
    const hash = await this.jwtService.signAsync(
      {
        verifyaccount: userCreated.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );

    await this.mailService.userSignUp({
      to: userCreated.email,
      data: {
        hash,
        user: userCreated,
      },
    });

    return hash;
  }

  async createSubUser(
    createProfileDto: CreateSubUserDto,
    user: User,
  ): Promise<any> {
    // Check if user already has 4 sub users
    const subUsers = await this.usersRepository.find({
      parentUserId: Number(user.id),
      isSubUser: true,
    });

    if (subUsers.length >= 4) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errors: { subUser: 'maxSubUsersReached' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const parentUser = await this.usersRepository.findOne({
      id: Number(user.id),
    });

    if (!parentUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          errors: {
            parentUser: 'notFound',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const payload: CreateUserDto = {
      ...createProfileDto,
      isSubUser: true,
      parentUserId: Number(user.id),
      company: '', //parentUser.company || '',
      name: createProfileDto.username || '',
      role: parentUser.role || null,
    };
    const userCreated = await this.create(payload);

    return userCreated;
  }

  async deleteSubUser(id: User['id'], parentUserId: User['id']): Promise<void> {
    // Check if the sub user belongs to the parent user
    const subUser = await this.usersRepository.findOne({ id });
    if (!subUser || subUser.parentUserId !== parentUserId) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          errors: { user: 'notAuthorized' },
        },
        HttpStatus.FORBIDDEN,
      );
    }
    await this.usersRepository.softDelete(id);
  }

  async updateSubUser(
    subUserId: User['id'],
    parentUserId: User['id'],
    body: DeepPartial<User>,
  ): Promise<User | null> {
    const subUser = await this.usersRepository.findOne({
      id: subUserId,
      parentUserId: Number(parentUserId),
      isSubUser: true,
    });
    if (!subUser) return null;
    if (body.username !== undefined) subUser.username = body.username;
    if (body.phone !== undefined) subUser.phone = body.phone;
    await this.usersRepository.update(subUser.id, subUser);
    return subUser;
  }

  async getUserPhoto(user: User, role: number): Promise<string | null> {
    if (
      user.isSubUser &&
      user.parentUserId &&
      [RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing].includes(role)
    ) {
      const parentUser = await this.usersRepository.findOne({
        id: user.parentUserId,
      });
      return parentUser?.photo || null;
    } else if (
      [RoleEnum.general_contractor, RoleEnum.manufacturer, RoleEnum.wood_processing].includes(role)
    ) {
      const dbUser = await this.usersRepository.findOne({ id: user.id });
      return dbUser?.photo || null;
    }
    return null;
  }

  async backfillApiKeysForCompanyAndManufacturer(): Promise<{
    scanned: number;
    generated: number;
  }> {
    // const rolesToBackfill = [
    //   RoleEnum.general_contractor,
    //   RoleEnum.manufacturer,
    // ];
    let scanned = 0;
    let generated = 0;

    // for (const roleId of rolesToBackfill) {
    const users = (await this.usersRepository.find({})) as any[];
    for (const u of users) {
      scanned += 1;
      const hasKey = await this.apiKeyService.userHasApiKey(Number(u.id));
      if (!hasKey) {
        await this.apiKeyService.generateAndStoreKey(Number(u.id));
        generated += 1;
      }
    }
    // }
    return { scanned, generated };
  }
}
