import { Exclude } from 'class-transformer';
import { DumpsterRefusedMmr } from 'src/dumpster-refused-mmr/domain/dumpster-refused-mmr';
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
  name: 'dumpster_refused_mmr',
})
export class DumpsterRefusedMmrEntity
  extends EntityRelationalHelper
  implements DumpsterRefusedMmr
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

  @Column({ type: Number, nullable: true })
  dumpsterLocationId: number | null;

  @Column({ type: Number, nullable: true })
  dumspterSize: number | null;

  @Column({ type: Number, nullable: true })
  dumspterCount: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
