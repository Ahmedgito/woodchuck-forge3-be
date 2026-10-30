import { Exclude } from 'class-transformer';
import { Dumpster } from 'src/dumpster/domain/dumpster';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
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
import { JobSitesWasteStreamsEntity } from '../../../../../job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Entity({
  name: 'dumpster',
})
export class DumpsterEntity extends EntityRelationalHelper implements Dumpster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  sublocationName: string;

  @Column({ nullable: false })
  distanceToMmr: string;

  @Column({ nullable: false, default: 'miles' })
  unit: string;

  @Column({ type: Boolean, default: false })
  isDefault: boolean;

  @OneToMany(() => SmsDumpsterEntity, (smsDumpster) => smsDumpster.dumpster, {
    onDelete: 'CASCADE',
  })
  smsDumpsters?: SmsDumpsterEntity[];

  @OneToMany(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) => jobSitesWasteStreams.jobSite,
  )
  jobSitesWasteStreams: JobSitesWasteStreamsEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
