import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VesselOptions } from 'src/vessel-options/domain/vessel-options';
import { Vessel } from 'src/vessels/domain/vessel';
import { VesselEntity } from 'src/vessels/infrastructure/persistence/relational/entities/vessel.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Entity({
  name: 'vessel_options',
})
export class VesselOptionsEntity
  extends EntityRelationalHelper
  implements VesselOptions
{
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: false })
  value: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: Number,
  })
  vesselId: Vessel['id'];

  @Index()
  @ManyToOne(() => VesselEntity, (vessel) => vessel.options)
  @JoinColumn()
  vessel: VesselEntity;

  @OneToMany(() => JobSitesWasteStreamsEntity, (ws) => ws.vessel)
  jobsiteWasteStreams: JobSitesWasteStreamsEntity[];
}
