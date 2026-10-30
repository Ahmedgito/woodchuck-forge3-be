import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { SmsDumpster } from '../../../../domain/sms-dumpster';
import { SmsDumpsterStatusesEnum } from '../../../../sms-dumpster-statuses.enum';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  AfterUpdate,
  AfterInsert,
} from 'typeorm';
import { DumpsterEntity } from 'src/dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { SmsEntity } from 'src/sms/infrastructure/persistence/relational/entities/sms.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { Exclude } from 'class-transformer';
import { NotificationEntity } from 'src/notifications/infrastructure/persistence/relational/entities/notification.entity';
import smsDumpsterOnUpdate from 'src/sms-dumpster/utils/sms-dumpster-onupdate';

@Entity({
  name: 'sms_dumpster',
})
export class SmsDumpsterEntity
  extends EntityRelationalHelper
  implements SmsDumpster
{
  @PrimaryGeneratedColumn()
  id: string;

  @Exclude()
  @ManyToOne(() => SmsEntity, { eager: true, onDelete: 'SET NULL' })
  sms: SmsEntity;

  @Exclude()
  @ManyToOne(() => JobSiteEntity, { eager: true, onDelete: 'SET NULL' })
  jobSite: JobSiteEntity;

  @Exclude()
  @ManyToOne(() => DumpsterEntity, { eager: true, onDelete: 'SET NULL' })
  dumpster: DumpsterEntity;

  @Column({
    type: 'enum',
    enum: SmsDumpsterStatusesEnum,
    default: SmsDumpsterStatusesEnum['request'],
    nullable: false,
  })
  status: SmsDumpsterStatusesEnum;

  @Column({ type: 'json', nullable: false })
  details: JSON;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @AfterInsert()
  async afterInsert() {
    const jobSiteDt = await JobSiteEntity.findOneBy({ id: this.jobSite.id });
    const notificationData: any = {
      jobSiteId: this.jobSite.id,
      jobSiteName: jobSiteDt?.city + ' ' + jobSiteDt?.state,
      sublocationName: this.dumpster.sublocationName,
      status: this.status,
      dstype: this.details['dstype'],
      dsSize: this.details['dsSize'],
      smsDumpsterId: this.id,
    };

    const title =
      'Requests ' +
      this.details['dstype'] +
      this.details['dsSize'] +
      ' yard dumpster';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const notification = await NotificationEntity.save(
      NotificationEntity.create({
        title: title,
        message: title,
        data: notificationData,
      }),
    );
  }
  @AfterUpdate()
  async afterUpdate() {
    await smsDumpsterOnUpdate(this, true);
  }
}
