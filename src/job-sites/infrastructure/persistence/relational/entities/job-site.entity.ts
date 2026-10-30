import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

import { SmsEntity } from 'src/sms/infrastructure/persistence/relational/entities/sms.entity';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { DumpsterRefusedMmrEntity } from 'src/dumpster-refused-mmr/infrastructure/persistence/relational/entities/dumpster-refused-mmr.entity';
import { JobSite } from 'src/job-sites/domain/job-site';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { Exclude } from 'class-transformer';
import { User } from 'src/users/domain/user';
import { JobSiteDetailsEntity } from 'src/job-sites-details/infrastructure/persistence/entities/job-site-details.entity';
import { StatusEntity } from 'src/statuses/infrastructure/persistence/relational/entities/status.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { JobSitesCamerasEntity } from 'src/job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { JobsiteSubLocationEntity } from 'src/job-sites-sub-locations/infrastructure/persistence/relational/entities/job-sites-sub-locations.entity';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';
import { CarbonCreditEntity } from 'src/carbon-credits/infrastructure/persistence/relational/entities/carbon-credit.entity';

@Entity({
  name: 'job_site',
})
export class JobSiteEntity extends EntityRelationalHelper implements JobSite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String, nullable: true })
  street: string | null;

  @Column({ type: String, nullable: true })
  city: string | null;

  @Column({ type: String, nullable: true })
  state: string | null;

  @Column({ type: String, nullable: true })
  zipcode: string | null;

  @Column({ type: String, nullable: true })
  name: string | null;

  @Column({ type: String, nullable: true })
  phone: string | null;

  @Column({ type: String, nullable: true })
  email: string | null;

  @Column({ type: Number, nullable: true })
  sizeSqft: number | null;

  @Column({ type: 'date', nullable: true })
  completedAt: Date;

  @Exclude()
  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  client: UserEntity;

  @Column({ type: Number, nullable: true })
  haulerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'date', nullable: true })
  closedAt: Date;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  woodWasteRecycled: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  diverted: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refused: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  co2Avoided: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalHailed: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalTonnage: number | null;

  @Column({ type: Number, nullable: true })
  mmrLocation: number | null;

  @Column({ type: String, nullable: true })
  title: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  woodWasteDiverted: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cardBoard: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  wasteHauling: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  metal: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  plastic: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  biomassForCleanEnergy: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  concrete: number | null;

  @OneToOne(
    () => JobSiteDetailsEntity,
    (jobSiteDetails) => jobSiteDetails.jobSite,
    { eager: true },
  )
  jobSiteDetails: JobSiteDetailsEntity;

  @OneToOne(() => AddressEntity, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'addressId' })
  address?: AddressEntity | null;

  @ManyToOne(() => StatusEntity, {
    eager: true,
  })
  status?: StatusEntity;

  @OneToMany(() => JobsiteSubLocationEntity, (dumpster) => dumpster.jobSite, {
    onDelete: 'SET NULL',
  })
  dumpsters?: JobsiteSubLocationEntity[];

  @OneToMany(() => SmsEntity, (sms) => sms.jobSite, {
    onDelete: 'SET NULL',
  })
  sms?: SmsEntity[];

  @OneToMany(() => SmsDumpsterEntity, (smsDumpster) => smsDumpster.jobSite, {
    onDelete: 'SET NULL',
  })
  smsDumpster?: SmsDumpsterEntity[];

  @OneToMany(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) => jobSitesWasteStreams.jobSite,
  )
  jobSitesWasteStreams: JobSitesWasteStreamsEntity[];

  @OneToMany(
    () => JobSitesCamerasEntity,
    (jobSitesCameras) => jobSitesCameras.jobSite,
  )
  jobSitesCameras: JobSitesCamerasEntity[];

  @OneToMany(
    () => DumpsterRefusedMmrEntity,
    (dumpsterRefusedMmr) => dumpsterRefusedMmr.jobSite,
  )
  dumpsterRefusedMmr?: DumpsterRefusedMmrEntity[];

  @OneToOne(
    () => CarbonCreditEntity,
    (carbonCredit) => carbonCredit.jobSite,
    { eager: true, nullable: true },
  )
  carbonCredit?: CarbonCreditEntity | null;

  @AfterLoad()
  getClientId() {
    this.clientId = this.client?.id;
    this.clientName = this.client?.name;
    this.clientUserName = this.client?.username;
  }
  clientId: User['id'];
  clientName: User['name'];
  clientUserName: User['username'];

  @Column({ type: Number, nullable: true })
  endClientId: number;
}
