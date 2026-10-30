import { Hauler } from 'src/haulers/domain/hauler';
import { HaulerTypeEntity } from 'src/haulertype/infrastructure/persistence/relational/entities/haulertype.entity';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobSitesWasteStreamsEntity } from '../../../../../job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Entity({
  name: 'hauler',
})
export class HaulerEntity extends EntityRelationalHelper implements Hauler {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: false })
  name: string;

  @Index()
  @OneToOne(() => HaulerTypeEntity)
  @JoinColumn()
  haulerType: HaulerTypeEntity;

  @Column({ type: 'json', nullable: true })
  dumpsterSize: JSON | null;

  @Index()
  @Column({ nullable: false })
  phone: string;

  @Index()
  @Column({ nullable: false })
  email: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: false })
  street?: string;

  @Column({ nullable: false })
  city?: string;

  @Column({ nullable: false })
  state?: string;

  @Column({ nullable: false })
  zip?: string;

  @Column({ nullable: false })
  country?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) => jobSitesWasteStreams.jobSite,
  )
  jobSitesWasteStreams: JobSitesWasteStreamsEntity[];
}
