import { Exclude, Expose } from 'class-transformer';
import { Role } from 'src/roles/domain/role';
import { Status } from 'src/statuses/domain/status';

export class User {
  id: number | string;

  email?: string | null;

  @Exclude({ toPlainOnly: true })
  password?: string;

  @Exclude({ toPlainOnly: true })
  previousPassword?: string;

  @Expose({ groups: ['me', 'admin'] })
  provider: string;

  @Expose({ groups: ['me', 'admin'] })
  socialId?: string | null;
  firstName?: string | null;
  lastName?: string | null;

  username: string | null;
  name: string | null;
  company: string | null;
  phone: string | null;

  billing_details_name?: string | null;

  billing_details_street?: string | null;

  billing_details_city?: string | null;

  billing_details_state?: string | null;

  billing_details_zipcode?: string | null;

  billing_details_country?: string | null;

  photo?: string | null; //FileType
  role?: Role | null;
  status?: Status;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
  demo?: boolean;

  isSubUser?: boolean;
  parentUserId?: number | null;
}
