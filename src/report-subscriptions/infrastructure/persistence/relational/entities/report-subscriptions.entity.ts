import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { WasteStreams } from 'src/wastestreams/domain/wastestreams';
import {
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobSitesWasteStreamsEntity } from '../../../../../job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { Exclude } from 'class-transformer';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { ReportTypeEnum } from 'src/report-subscriptions/report-types.enum';
import { ReportFrequencyEnum } from 'src/report-subscriptions/report-frequency.enum';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import { CompressionExtensionEnum } from 'src/report-subscriptions/compression-extension.enum';
import { ReportSubscription } from 'src/report-subscriptions/domain/report-subscriptions';

@Entity({
  name: 'report_subscriptions',
})
export class ReportSubscriptionsEntity
  extends EntityRelationalHelper
  implements ReportSubscription
{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.subscriptions)
  user: UserEntity;

  @Column({ type: 'enum', enum: ReportTypeEnum })
  reportType: ReportTypeEnum;

  @ManyToOne(() => JobSiteEntity, { nullable: true })
  jobSite: JobSiteEntity | null;

  @Column({
    type: 'enum',
    enum: ReportFrequencyEnum,
    default: ReportFrequencyEnum.MONTHLY,
  })
  frequency: ReportFrequencyEnum;

  @Column({ type: 'json', default: [ReportFormatEnum.PDF] })
  formats: ReportFormatEnum[];

  @Column({
    type: 'enum',
    enum: CompressionExtensionEnum,
    default: CompressionExtensionEnum.ZIP,
  })
  compressionExtension: CompressionExtensionEnum;

  /**
   * Addresses CC'd on this subscription's report emails. Visible to the
   * recipient, unlike the internal BCC list.
   */
  @Column({ type: 'json', default: [] })
  reportCcEmails: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
