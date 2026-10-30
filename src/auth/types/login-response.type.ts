import { User } from 'src/users/domain/user';

export type LoginResponseType = Readonly<{
  token: string;
  refreshToken: string;
  tokenExpires: number;
  user: User;
  impersonated?: boolean;
  originalUserId?: User['id'];
  impersonationLogId?: number;
}>;
