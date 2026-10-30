import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  Post,
  UseGuards,
  Patch,
  Delete,
  SerializeOptions,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthConfirmEmailDto } from './dto/auth-confirm-email.dto';
import { AuthResetPasswordDto } from './dto/auth-reset-password.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { LoginResponseType } from './types/login-response.type';
import { NullableType } from '../utils/types/nullable.type';
import { User } from 'src/users/domain/user';
import { AuthUpdatePasswordDto } from './dto/auth-update-password.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ImpersonateDto } from './dto/impersonate.dto';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { RoleEnum } from 'src/roles/roles.enum';
import { AuthAutoLoginDto } from './dto/auth-auto-login.dto';
import { ResetPasswordResponseType } from './types/reset-password-response.type';
import { SkipAll } from './skip-all.decorator';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @SkipAll()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('email/login')
  @HttpCode(HttpStatus.OK)
  public login(
    @Body() loginDto: AuthEmailLoginDto,
  ): Promise<LoginResponseType> {
    return this.service.validateLogin(loginDto);
  }

  @SkipAll()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('client/login')
  @HttpCode(HttpStatus.OK)
  public clientLogin(
    @Body() loginDto: AuthEmailLoginDto,
  ): Promise<LoginResponseType> {
    return this.service.validateClientLogin(loginDto);
  }

  @SkipAll()
  @Post('email/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() createUserDto: AuthRegisterLoginDto): Promise<void> {
    return this.service.register(createUserDto);
  }

  @SkipAll()
  @Post('email/register-user')
  @HttpCode(HttpStatus.OK)
  async registerUser(@Body() createUserDto: CreateUserDto): Promise<void> {
    return this.service.registerUser(createUserDto);
  }

  @SkipAll()
  @Post('email/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.service.confirmEmail(confirmEmailDto.hash);
  }

  @SkipAll()
  @Post('forgot/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto,
  ): Promise<void> {
    return this.service.forgotPassword(forgotPasswordDto.email);
  }

  @SkipAll()
  @Post('reset/password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body() resetPasswordDto: AuthResetPasswordDto,
  ): Promise<ResetPasswordResponseType> {
    return this.service.resetPassword(
      resetPasswordDto.hash,
      resetPasswordDto.password,
    );
  }

  @SkipAll()
  @Get('reset/verifyToken')
  @HttpCode(HttpStatus.OK)
  resetPasswordVerify(@Query('hash') hashString: string): Promise<void> {
    return this.service.resetPasswordVerify(hashString);
  }
  @SkipAll()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('autoLogin')
  @HttpCode(HttpStatus.OK)
  async autoLogin(
    @Body() autoLoginDto: AuthAutoLoginDto,
  ): Promise<LoginResponseType> {
    return this.service.autoLogin(autoLoginDto.token);
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('update/password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePassword(
    @Body() updatePasswordDto: AuthUpdatePasswordDto,
  ): Promise<void> {
    return this.service.updatePassword(
      Number(updatePasswordDto.userId),
      String(updatePasswordDto.password),
    );
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  public me(@Request() request): Promise<NullableType<User>> {
    return this.service.me(request.user);
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  public refresh(
    @Request() request,
    @Body() body: any,
  ): Promise<Omit<LoginResponseType, 'user'>> {
    return this.service.refreshToken(request.user, body);
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Request() request): Promise<void> {
    await this.service.logout({
      sessionId: request.user.sessionId,
    });
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  public update(
    @Request() request,
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.service.update(request.user, userDto);
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Request() request): Promise<void> {
    return this.service.softDelete(request.user);
  }

  @ApiBearerAuth()
  @Post('impersonation')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  public async impersonate(@Request() request, @Body() body: ImpersonateDto) {
    return this.service.impersonate(request.user, body);
  }

  @ApiBearerAuth()
  @Post('impersonation/revert')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  public async revertImpersonation(
    @Request() request,
  ): Promise<LoginResponseType> {
    return this.service.revertImpersonation(request.user);
  }
}
