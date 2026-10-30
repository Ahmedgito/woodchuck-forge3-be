import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

import { PowerPlantsEntity } from 'src/power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { JobSiteDetails } from 'src/job-sites-details/domain/job-site-details';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';

@Entity({
  name: 'job_site_details',
})
export class JobSiteDetailsEntity
  extends EntityRelationalHelper
  implements JobSiteDetails
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String, nullable: true })
  address: string | null;

  @Column({ type: 'float', nullable: true })
  sustainabilityGoal: number | null;

  @Column({ nullable: true, type: 'float' })
  size: string | null;

  @Column({ type: 'date', nullable: true, name: 'completedAt' })
  completionBy: Date;

  @ManyToOne(() => PowerPlantsEntity, {
    eager: true,
  })
  powerplants: PowerPlantsEntity;

  @OneToOne(() => JobSiteEntity, (jobSite) => jobSite.jobSiteDetails)
  @JoinColumn()
  @Index()
  jobSite: JobSiteEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
