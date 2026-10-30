import { Exclude } from 'class-transformer';
import { DumpsterLiveView } from 'src/dumpster-live-view/domain/dumpster-live-view';
import { JobSite } from 'src/job-sites/domain/job-site';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'dumpster_live_view',
})
export class DumpsterLiveViewEntity
  extends EntityRelationalHelper
  implements DumpsterLiveView
{
  @PrimaryGeneratedColumn()
  id: number;

  @AfterLoad()
  getJobSiteId() {
    this.jobSiteId = this.jobSite?.id ? this.jobSite?.id : null;
  }
  jobSiteId: JobSite['id'] | null;

  @Exclude()
  @ManyToOne(() => JobSiteEntity, { eager: true, onDelete: 'SET NULL' })
  jobSite?: JobSiteEntity;

  @Column({ type: String, nullable: true })
  s3ImageUrl: string | null;

  @Column({ type: Number, nullable: true })
  fillPercentage: number | null;

  @Column({ type: Number, nullable: true })
  gateId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
