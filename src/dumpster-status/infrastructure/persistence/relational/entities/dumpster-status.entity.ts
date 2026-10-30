import { Exclude } from 'class-transformer';
import { DumpsterStatus } from 'src/dumpster-status/domain/dumpster-status';
import { JobSite } from 'src/job-sites/domain/job-site';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { DecimalColumnTransformer } from 'src/utils/transformers/decimal-column.transformer';

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
  name: 'dumpster_status',
})
export class DumpsterStatusEntity
  extends EntityRelationalHelper
  implements DumpsterStatus
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

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  miles: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  waste: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
