import { DumpsterEntity } from 'src/dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('jobsite_sub_locations')
export class JobsiteSubLocationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  jobSiteId: number;

  @Column()
  @Index()
  dumpsterId: number;

  @ManyToOne(() => JobSiteEntity, (jobSite) => jobSite.dumpsters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobSiteId' })
  jobSite: JobSiteEntity;

  @ManyToOne(() => DumpsterEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dumpsterId' })
  dumpster: DumpsterEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
