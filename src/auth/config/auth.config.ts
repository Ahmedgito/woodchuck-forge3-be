import { registerAs } from '@nestjs/config';
import { AuthConfig } from 'src/auth/config/auth-config.type';
import { IsString, Length } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  AUTH_JWT_SECRET: string;

  @IsString()
  AUTH_JWT_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_IMPERSONATION_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_REFRESH_SECRET: string;

  @IsString()
  AUTH_REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_FORGOT_SECRET: string;

  @IsString()
  AUTH_FORGOT_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_SECRET: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: string;

  // API key settings
  @IsString()
  API_KEY_PEPPER: string;

  @IsString()
  @Length(43, 44)
  API_KEY_ENCRYPTION_KEY: string;
}

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    secret: process.env.AUTH_JWT_SECRET,
    expires: process.env.AUTH_JWT_TOKEN_EXPIRES_IN,
    impersonationExpires: process.env.AUTH_IMPERSONATION_TOKEN_EXPIRES_IN,
    refreshSecret: process.env.AUTH_REFRESH_SECRET,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN,
    forgotSecret: process.env.AUTH_FORGOT_SECRET,
    forgotExpires: process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN,
    confirmEmailSecret: process.env.AUTH_CONFIRM_EMAIL_SECRET,
    confirmEmailExpires: process.env.AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN,
    apiKeyPepper: process.env.API_KEY_PEPPER as string,
    apiKeyEncryptionKeyBase64: process.env.API_KEY_ENCRYPTION_KEY as string,
  };
});
