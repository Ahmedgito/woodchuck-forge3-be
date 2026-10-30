import { Exclude } from 'class-transformer';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { Sms } from 'src/sms/domain/sms';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'sms',
})
export class SmsEntity extends EntityRelationalHelper implements Sms {
  @PrimaryGeneratedColumn()
  id: string;

  @Exclude()
  @ManyToOne(() => JobSiteEntity, { eager: true, onDelete: 'CASCADE' })
  jobSite: JobSiteEntity;

  @Column({ type: 'text', nullable: false })
  orignalSms: string;

  @Column({ type: 'json', nullable: true })
  orignalResp: JSON | null;

  @OneToMany(() => SmsDumpsterEntity, (smsDumpster) => smsDumpster.sms, {
    onDelete: 'SET NULL',
  })
  smsDumpsters?: SmsDumpsterEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
