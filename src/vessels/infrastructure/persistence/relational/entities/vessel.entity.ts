import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vessel } from 'src/vessels/domain/vessel';
import { VesselOptionsEntity } from 'src/vessel-options/infrastructure/persistence/relational/entities/vessel-options.entity';
import { WasteStreamTypeVesselsEntity } from 'src/wastestream-type-vessels/infrastructure/persistence/relational/entities/wastestream-type-vessels.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';

@Entity({
  name: 'vessel',
})
export class VesselEntity extends EntityRelationalHelper implements Vessel {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: false })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => VesselOptionsEntity, (options) => options.vessel)
  options: VesselOptionsEntity[];

  @OneToMany(() => WasteStreamTypeVesselsEntity, (wstv) => wstv.vessel)
  wasteStreamTypes: WasteStreamTypeVesselsEntity[];

  @OneToMany(() => JobSitesWasteStreamsEntity, (ws) => ws.vessel)
  jobsiteWasteStreams: JobSitesWasteStreamsEntity[];
}
