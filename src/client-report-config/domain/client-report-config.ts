import { User } from 'src/users/domain/user';

export class ClientReportConfig {
  id: number;
  client: User;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
