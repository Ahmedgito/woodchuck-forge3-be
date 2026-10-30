import { LocationsToTypesEnum } from 'src/locations/locationToTypes.enum';
import { JobSiteDetailsEntity } from 'src/job-sites-details/infrastructure/persistence/entities/job-site-details.entity';
import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  AfterLoad,
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
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';

@Entity({
  name: 'power_plants',
})
export class PowerPlantsEntity
  extends EntityRelationalHelper
  implements PowerPlants
{
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: false })
  name: string;

  @OneToMany(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) => jobSitesWasteStreams.jobSite,
    { nullable: true },
  )
  jobSitesWasteStreams: JobSitesWasteStreamsEntity[];

  @OneToMany(
    () => JobSiteDetailsEntity,
    (jobSiteDetails) => jobSiteDetails.powerplants,
    { onDelete: 'SET NULL' },
  ) // specify inverse side as a second parameter
  @JoinColumn()
  jobSiteDetails?: JobSiteDetailsEntity[] | null;

  @Index()
  @Column({ nullable: true, type: 'float' })
  btuPerTon: number;

  @Index()
  @Column({ nullable: true, type: 'float', default: 1.0 })
  kwhPerTon: number;

  @OneToOne(() => AddressEntity, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'addressId' })
  address?: AddressEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @AfterLoad()
  getToType() {
    this.toType = LocationsToTypesEnum['powerplant'];
    this.entityType = LocationsToTypesEnum['powerplant'];
    this.typeLabel = 'Power Plant';
  }
  toType: number;
  entityType: number;
  typeLabel: string | undefined;
}
