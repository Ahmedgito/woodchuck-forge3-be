import { registerAs } from '@nestjs/config';
import { MailConfig } from 'src/mail/config/mail-config.type';
import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  MAIL_PORT: number;

  @IsString()
  MAIL_HOST: string;

  @IsString()
  @IsOptional()
  MAIL_USER: string;

  @IsString()
  @IsOptional()
  MAIL_PASSWORD: string;

  @IsEmail()
  MAIL_DEFAULT_EMAIL: string;

  @IsString()
  MAIL_DEFAULT_NAME: string;

  @IsBoolean()
  MAIL_IGNORE_TLS: boolean;

  @IsBoolean()
  MAIL_SECURE: boolean;

  @IsBoolean()
  MAIL_REQUIRE_TLS: boolean;

  @IsString()
  @IsOptional()
  INTERNAL_REPORT_BCC_EMAILS: string;
}

export default registerAs<MailConfig>('mail', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** Splits a comma-separated env var into validated email addresses. */
  const parseEmailList = (raw: string | undefined, varName: string) => {
    const entries = (raw || '')
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const valid = entries.filter((email) => {
      const isValid = EMAIL_REGEX.test(email);
      if (!isValid) {
        console.warn(
          `[MailConfig] Invalid email in ${varName} skipped: "${email}"`,
        );
      }
      return isValid;
    });

    if (entries.length > 0) {
      console.log(
        `[MailConfig] ${varName} loaded: ${valid.length} valid / ${entries.length} total`,
      );
    }

    return valid;
  };

  const internalReportBccEmails = parseEmailList(
    process.env.INTERNAL_REPORT_BCC_EMAILS,
    'INTERNAL_REPORT_BCC_EMAILS',
  );

  return {
    port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
    host: process.env.MAIL_HOST,
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    defaultEmail: process.env.MAIL_DEFAULT_EMAIL,
    defaultName: process.env.MAIL_DEFAULT_NAME,
    ignoreTLS: process.env.MAIL_IGNORE_TLS === 'true',
    secure: process.env.MAIL_SECURE === 'true',
    requireTLS: process.env.MAIL_REQUIRE_TLS === 'true',
    internalReportBccEmails,
  };
});
