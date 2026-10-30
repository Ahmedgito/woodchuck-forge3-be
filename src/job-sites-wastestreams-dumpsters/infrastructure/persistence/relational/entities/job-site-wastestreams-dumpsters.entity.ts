import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { JobSiteWastestreamsDumpsters } from 'src/job-sites-wastestreams-dumpsters/domain/job-site-wastestreams-dumpsters';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { Exclude } from 'class-transformer';

@Entity({
  name: 'job_site_wastestreams_dumpsters',
})
export class JobSiteWastestreamsDumpstersEntity
  extends EntityRelationalHelper
  implements JobSiteWastestreamsDumpsters
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', nullable: true })
  estimated_weight: number | null;

  @Column({ type: 'float', nullable: true })
  real_weight: number | null;

  @Column({ type: 'date', nullable: false })
  creationDate: Date;

  @Exclude()
  @Index()
  @ManyToOne(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) =>
      jobSitesWasteStreams.jobSitesWasteStreamsDumpsters,
    {
      eager: true,
    },
  )
  jobSiteWastestreams: JobSitesWasteStreamsEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
