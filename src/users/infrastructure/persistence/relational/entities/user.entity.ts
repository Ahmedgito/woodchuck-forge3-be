import {
  Column,
  AfterLoad,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { AuthProvidersEnum } from 'src/auth/auth-providers.enum';
// We use class-transformer in ORM entity and domain entity.
// We duplicate these rules because you can choose not to use adapters
// in your project and return an ORM entity directly in response.
import { Exclude, Expose } from 'class-transformer';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { RoleEntity } from 'src/roles/infrastructure/persistence/relational/entities/role.entity';
import { StatusEntity } from 'src/statuses/infrastructure/persistence/relational/entities/status.entity';
import { User } from 'src/users/domain/user';
import { ReportSubscriptionsEntity } from 'src/report-subscriptions/infrastructure/persistence/relational/entities/report-subscriptions.entity';

@Entity({
  name: 'user',
})
export class UserEntity extends EntityRelationalHelper implements User {
  @PrimaryGeneratedColumn()
  id: number;

  // For "string | null" we need to use String type.
  // More info: https://github.com/typeorm/typeorm/issues/2567
  @Column({ type: String, unique: true, nullable: true })
  @Expose({ groups: ['me', 'admin'] })
  email: string | null;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  password?: string;

  @Exclude({ toPlainOnly: true })
  public previousPassword?: string;

  @AfterLoad()
  public loadPreviousPassword(): void {
    this.previousPassword = this.password;
  }

  @Column({ default: AuthProvidersEnum.email })
  @Expose({ groups: ['me', 'admin'] })
  provider: string;

  @Index()
  @Column({ type: String, nullable: true })
  @Expose({ groups: ['me', 'admin'] })
  socialId?: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  username: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  name: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  company: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  phone: string | null;

  // @ManyToOne(() => FileEntity, {
  //   eager: true,
  // })
  @Column({ type: 'text', nullable: true })
  photo?: string | null;

  @OneToMany(() => JobSiteEntity, (jobSite) => jobSite.client, {
    onDelete: 'SET NULL',
  })
  jobSite?: JobSiteEntity[] | null;

  @ManyToOne(() => RoleEntity, {
    eager: true,
  })
  role?: RoleEntity | null;

  @ManyToOne(() => StatusEntity, {
    eager: true,
  })
  status?: StatusEntity;

  @Index()
  @Column({ type: String, nullable: true })
  billing_details_name: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  billing_details_street: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  billing_details_city: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  billing_details_state: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  billing_details_zipcode: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  billing_details_country: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ type: 'boolean', default: 'false' })
  demo: boolean;

  @Column({ type: 'boolean', default: false })
  isSubUser?: boolean;

  @Column({ type: 'int', nullable: true })
  parentUserId?: number | null;

  @OneToMany(
    () => ReportSubscriptionsEntity,
    (subscriptions) => subscriptions.user,
    {
      onDelete: 'SET NULL',
    },
  )
  subscriptions?: ReportSubscriptionsEntity[] | null;

  // Per-user API key authentication fields
  @Column({ type: 'text', nullable: true, select: false })
  api_key_hash?: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  api_key_encrypted?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  api_key_created_at?: Date | null;

  @Column({ type: 'boolean', default: false })
  api_key_revoked?: boolean;

  @Column({ type: 'boolean', default: false })
  isApiOnly?: boolean;
}
