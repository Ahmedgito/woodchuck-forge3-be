import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { LocationsEntity } from 'src/locations/infrastructure/persistence/relational/entities/locations.entity';
import { PowerPlantsEntity } from 'src/power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';
import { JobsiteWasteStreamLocations } from 'src/job-site-waste-stream-locations/domain/job-site-waste-stream-locations';
import { Hauler } from 'src/haulers/domain/hauler';
import { Locations } from 'src/locations/domain/locations';
import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { DecimalColumnTransformer } from 'src/utils/transformers/decimal-column.transformer';

@Entity({
  name: 'jobsite_wastestream_locations',
})
export class JobsiteWasteStreamLocationsEntity
  extends EntityRelationalHelper
  implements JobsiteWasteStreamLocations
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobsiteWasteStreamId: number;

  @ManyToOne(
    () => JobSitesWasteStreamsEntity,
    (jobsiteWasteStream) => jobsiteWasteStream.wasteStreamLocations,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'jobsiteWasteStreamId' })
  jobsiteWasteStream: JobSitesWasteStreamsEntity;

  @Column()
  type: number;

  @Column({ nullable: true })
  locationId: number;

  @ManyToOne(() => LocationsEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'locationId' })
  location: LocationsEntity;

  @Column({ nullable: true })
  powerplantId: number;

  @ManyToOne(() => PowerPlantsEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'powerplantId' })
  powerplant: PowerPlantsEntity;

  @Column({ nullable: true })
  haulerId: number;

  @ManyToOne(() => HaulerEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'haulerId' })
  hauler: HaulerEntity;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  distance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  haulerName?: Hauler['name'];
  locationName?: Locations['name'];
  powerplantName?: PowerPlants['name'];

  @AfterLoad()
  populateNames() {
    if (this.haulerId) {
      this.haulerName = this.hauler?.name ?? null;
    }

    if (this.locationId) {
      this.locationName = this.location?.name ?? null;
    }

    if (this.powerplantId) {
      this.locationName = this.powerplant?.name ?? null;
    }
  }
}
