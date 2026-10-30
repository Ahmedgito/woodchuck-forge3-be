import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import ms from 'ms';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { RoleEnum } from 'src/roles/roles.enum';
import { StatusEnum } from 'src/statuses/statuses.enum';
import { AuthProvidersEnum } from './auth-providers.enum';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { MailService } from 'src/mail/mail.service';
import { NullableType } from '../utils/types/nullable.type';
import { LoginResponseType } from './types/login-response.type';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from 'src/config/config.type';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { User } from 'src/users/domain/user';
import { Session } from 'src/session/domain/session';
import { UsersService } from 'src/users/users.service';
import { SessionService } from 'src/session/session.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ImpersonationService } from 'src/impersonation/impersonation.service';
import { ResetPasswordResponseType } from './types/reset-password-response.type';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private sessionService: SessionService,
    private mailService: MailService,
    private configService: ConfigService<AllConfigType>,
    private impersonationService: ImpersonationService,
  ) {}

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseType> {
    const user = await this.usersService.findOne({
      email: loginDto.email,
      demo: this.configService.getOrThrow('app.isDemo', { infer: true }),
    } as { email: string; demo: boolean });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'notFound',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.provider !== AuthProvidersEnum.email) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: `needLoginViaProvider:${user.provider}`,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!user.password) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            password: 'incorrectPassword',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            password: 'incorrectPassword',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.status?.id === StatusEnum.inactive) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'Account not active',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const session = await this.sessionService.create({
      user,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      isSubUser: user.isSubUser,
      parentUserId: user.parentUserId,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
    };
  }

  async validateSocialLogin(
    authProvider: string,
    socialData: SocialInterface,
  ): Promise<LoginResponseType> {
    let user: NullableType<User> = null;
    const socialEmail = socialData.email?.toLowerCase();
    let userByEmail: NullableType<User> = null;

    if (socialEmail) {
      userByEmail = await this.usersService.findOne({
        email: socialEmail,
      });
    }

    if (socialData.id) {
      user = await this.usersService.findOne({
        socialId: socialData.id,
        provider: authProvider,
      });
    }

    if (user) {
      if (socialEmail && !userByEmail) {
        user.email = socialEmail;
      }
      await this.usersService.update(user.id, user);
    } else if (userByEmail) {
      user = userByEmail;
    } else {
      // user = await this.usersService.create({
      //   email: socialEmail ?? null,
      //   firstName: socialData.firstName ?? null,
      //   lastName: socialData.lastName ?? null,
      //   socialId: socialData.id,
      //   provider: authProvider,
      //   role,
      //   status,
      // });
      // user = await this.usersService.findOne({
      //   id: user?.id,
      // });
    }

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            user: 'userNotFound',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const session = await this.sessionService.create({
      user,
    });

    const {
      token: jwtToken,
      refreshToken,
      tokenExpires,
    } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
    });

    return {
      refreshToken,
      token: jwtToken,
      tokenExpires,
      user,
    };
  }

  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const user = await this.usersService.create({
      ...dto,
      email: dto.email,
      role: {
        id: RoleEnum.general_contractor,
      },
      status: {
        id: StatusEnum.inactive,
      },
      username: '',
      name: '',
      company: '',
      phone: '',
    });

    const hash = await this.jwtService.signAsync(
      {
        confirmEmailUserId: user.id,
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
      to: dto.email,
      data: {
        hash,
        user,
      },
    });
  }

  async registerUser(dto: CreateUserDto): Promise<void> {
    await this.usersService.createUser(dto);
  }

  async confirmEmail(hash: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
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

    const user = await this.usersService.findOne({
      id: userId,
    });

    if (!user || user?.status?.id !== StatusEnum.inactive) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `notFound`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    user.status = {
      id: StatusEnum.active,
    };

    await this.usersService.update(user.id, user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOne({
      email,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailNotExists',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.forgotExpires', {
          infer: true,
        }),
      },
    );

    await this.mailService.forgotPassword({
      to: email,
      data: {
        hash,
      },
    });
  }

  async resetPassword(
    hash: string,
    password: string,
  ): Promise<ResetPasswordResponseType> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });

      userId = jwtData.forgotUserId;
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

    const user = await this.usersService.findOne({
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

    await this.sessionService.softDelete({
      user: {
        id: user.id,
      },
    });

    await this.usersService.update(user.id, user, false);

    // Generate auto-login token
    const autoLoginToken = await this.generateAutoLoginToken(user.id);

    return {
      success: true,
      autoLoginToken,
    };
  }

  async resetPasswordVerify(hash: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new HttpException(
        {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            hash: 'Token Expired or not exists',
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async updatePassword(userId: number, password: string): Promise<void> {
    const user = await this.usersService.findOne({
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
    await this.usersService.update(user.id, user);
  }

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    const user = await this.usersService.findOne({
      id: userJwtPayload.id,
    });
    if (
      user?.isSubUser &&
      (user.role?.id === RoleEnum.general_contractor ||
        user.role?.id === RoleEnum.manufacturer ||
        user.role?.id === RoleEnum.wood_processing) &&
      user.parentUserId
    ) {
      const parentUser = await this.usersService.findOne({
        id: user.parentUserId,
      });
      if (parentUser?.photo) {
        // Attach parent photo to sub user
        (user as any).photo = parentUser.photo;
      }
    }
    return user;
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    if (userDto.password) {
      if (!userDto.oldPassword) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              oldPassword: 'missingOldPassword',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const currentUser = await this.usersService.findOne({
        id: userJwtPayload.id,
      });

      if (!currentUser) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              user: 'userNotFound',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (!currentUser.password) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              oldPassword: 'incorrectOldPassword',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const isValidOldPassword = await bcrypt.compare(
        userDto.oldPassword,
        currentUser.password,
      );

      if (!isValidOldPassword) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              oldPassword: 'incorrectOldPassword',
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      } else {
        await this.sessionService.softDelete({
          user: {
            id: currentUser.id,
          },
          excludeId: userJwtPayload.sessionId,
        });
      }
    }

    await this.usersService.update(userJwtPayload.id, userDto, false);

    return this.usersService.findOne({
      id: userJwtPayload.id,
    });
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId'>,
    body: any,
  ): Promise<LoginResponseType> {
    const session = await this.sessionService.findOne({
      id: data.sessionId,
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      role: session.user.role,
      sessionId: session.id,
      isSubUser: session.user.isSubUser,
      parentUserId: session.user.parentUserId,
      impersonated: body.impersonated,
      originalUserId: body.originalUserId,
      impersonationLogId: body.impersonationLogId,
    });

    return {
      token,
      refreshToken,
      tokenExpires,
      user: session.user,
    };
  }

  async softDelete(user: User): Promise<void> {
    await this.usersService.softDelete(user.id);
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.softDelete({
      id: data.sessionId,
    });
  }

  private async getTokensData(data: {
    id: User['id'];
    role: User['role'];
    sessionId: Session['id'];
    isSubUser?: boolean;
    parentUserId?: User['parentUserId'];
    impersonated?: boolean;
    originalUserId?: User['id'];
    impersonationLogId?: number;
  }) {
    let accessExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    let refreshExpiresIn = this.configService.getOrThrow(
      'auth.refreshExpires',
      { infer: true },
    );

    if (data.impersonated) {
      const impersonationExpires = this.configService.getOrThrow(
        'auth.impersonationExpires',
        { infer: true },
      );
      accessExpiresIn = impersonationExpires;
      refreshExpiresIn = impersonationExpires;
    }

    const tokenExpires = Date.now() + ms(accessExpiresIn);

    const [token, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
          isSubUser: data.isSubUser,
          parentUserId: data.parentUserId,
          impersonated: data.impersonated,
          originalUserId: data.originalUserId,
          impersonationLogId: data.impersonationLogId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: accessExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async validateClientLogin(
    loginDto: AuthEmailLoginDto,
  ): Promise<LoginResponseType> {
    const allowedRoles = new Set([
      RoleEnum.general_contractor,
      RoleEnum.manufacturer,
      RoleEnum.wood_processing,
    ]);

    const user = await this.usersService.findOne({
      email: loginDto.email,
    });
    const userRoleId = user?.role?.id;
    if (!userRoleId || !allowedRoles.has(userRoleId)) {
      throw new UnauthorizedException();
    }

    const validLogin = await this.validateLogin(loginDto);

    return validLogin;
  }

  /**
   * Super admin impersonates a client user.
   * Returns new tokens for the impersonated session.
   */
  async impersonate(
    userJwtPayload: JwtPayloadType,
    // res: any,
    body: { targetUserId: number; reason?: string },
  ): Promise<LoginResponseType> {
    try {
      // only allow real super admins (role id check could be adapted)
      if (!userJwtPayload || userJwtPayload.role?.id !== RoleEnum.admin) {
        throw new UnauthorizedException();
      }

      // Prevent nested impersonation
      if ((userJwtPayload as any).impersonated) {
        throw new HttpException(
          'Nested impersonation not allowed',
          HttpStatus.FORBIDDEN,
        );
      }

      const targetUser = await this.usersService.findOne({
        id: body.targetUserId,
      });
      if (!targetUser) {
        throw new HttpException('Target user not found', HttpStatus.NOT_FOUND);
      }

      // create an impersonation log
      const log = await this.impersonationService.createLog(
        Number(userJwtPayload.id),
        Number(body.targetUserId),
        body.reason,
      );

      // create a session for impersonated user
      const session = await this.sessionService.create({ user: targetUser });

      const { token, refreshToken, tokenExpires } = await this.getTokensData({
        id: targetUser.id,
        role: targetUser.role,
        sessionId: session.id,
        isSubUser: targetUser.isSubUser,
        parentUserId: targetUser.parentUserId,
        impersonated: true,
        originalUserId: userJwtPayload.id,
        impersonationLogId: log.id,
      });

      // We need to re-sign token to include impersonation fields; create token explicitly
      // const impersonationExpiresIn = this.configService.getOrThrow(
      //   'auth.impersonationExpires',
      //   { infer: true },
      // );
      // const tokenWithImpersonation = await this.jwtService.signAsync(
      //   {
      //     id: targetUser.id,
      //     role: targetUser.role,
      //     sessionId: session.id,
      //     // keep optional fields consistent with normal tokens
      //     isSubUser: targetUser.isSubUser,
      //     parentUserId: targetUser.parentUserId,
      //     // impersonation flags
      //     impersonated: true,
      //     originalUserId: userJwtPayload.id,
      //     impersonationLogId: log.id,
      //   },
      //   {
      //     secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      //     expiresIn: impersonationExpiresIn,
      //   },
      // );
      // const tokenExpires = Date.now() + ms(impersonationExpiresIn);

      // res.cookie('admin_session', tokenWithImpersonation, {
      //   httpOnly: true,
      //   secure: true,
      //   sameSite: 'strict',
      // });

      return {
        token,
        refreshToken,
        tokenExpires,
        user: targetUser,
        impersonated: true,
        originalUserId: userJwtPayload.id,
        impersonationLogId: log.id,
      };
    } catch (error) {
      // Handle errors, e.g., log and rethrow or return error response
      console.error('Impersonation error:', error);
      throw new HttpException(
        'Impersonation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async revertImpersonation(
    userJwtPayload: JwtPayloadType,
  ): Promise<LoginResponseType> {
    try {
      // If not impersonated, nothing to do
      if (
        !(userJwtPayload as any).impersonated ||
        !(userJwtPayload as any).originalUserId
      ) {
        throw new UnauthorizedException();
      }

      const logId = (userJwtPayload as any).impersonationLogId;
      if (logId) {
        await this.impersonationService.endLog(logId);
      }

      // Soft-delete the current session so the impersonated token cannot be used for refresh
      await this.sessionService.softDelete({ id: userJwtPayload.sessionId });

      // Create a new session/token for the original user and return to client
      const originalUserId = Number((userJwtPayload as any).originalUserId);
      const originalUser = await this.usersService.findOne({
        id: originalUserId,
      });
      if (!originalUser) {
        throw new UnauthorizedException();
      }

      const session = await this.sessionService.create({ user: originalUser });

      const { token, refreshToken, tokenExpires } = await this.getTokensData({
        id: originalUser.id,
        role: originalUser.role,
        sessionId: session.id,
        isSubUser: originalUser.isSubUser,
        parentUserId: originalUser.parentUserId,
      });

      return {
        token,
        refreshToken,
        tokenExpires,
        user: originalUser,
      };
    } catch (error) {
      console.error('Revert impersonation error:', error);
      throw error;
    }
  }

  /**
   * Generates a short-lived JWT token for auto-login after password reset or initial signup.
   * Token expires in 5 minutes and only contains userId.
   */
  async generateAutoLoginToken(userId: User['id']): Promise<string> {
    return this.jwtService.signAsync(
      {
        userId,
      },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: '5m',
      },
    );
  }

  /**
   * Verifies the auto-login token and returns a full login response (tokens + user),
   * matching the shape of validateLogin.
   * Throws UnauthorizedException if token is invalid or expired.
   */
  async autoLogin(token: string): Promise<LoginResponseType> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        userId: User['id'];
      }>(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });

      userId = jwtData.userId;
    } catch {
      throw new UnauthorizedException('Invalid or expired auto-login token');
    }

    const user = await this.usersService.findOne({
      id: userId,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Create a new session and issue access/refresh tokens, same as validateLogin
    const session = await this.sessionService.create({
      user,
    });

    const {
      token: accessToken,
      refreshToken,
      tokenExpires,
    } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      isSubUser: user.isSubUser,
      parentUserId: user.parentUserId,
    });

    return {
      token: accessToken,
      refreshToken,
      tokenExpires,
      user,
    };
  }
}
