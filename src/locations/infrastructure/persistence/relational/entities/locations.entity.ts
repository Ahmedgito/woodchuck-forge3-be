import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Locations } from '../../../../domain/locations';
import { LocationsToTypesEnum } from 'src/locations/locationToTypes.enum';
import { LocationsTypeEnum } from 'src/locations/locationTypes.enum';
import { JobSitesWasteStreamsEntity } from '../../../../../job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { AddressEntity } from 'src/address/infrastructure/persistence/relational/entities/address.entity';

@Entity({
  name: 'locations',
})
export class LocationsEntity
  extends EntityRelationalHelper
  implements Locations
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: LocationsTypeEnum,
    default: LocationsTypeEnum['Wood Waste Process'],
  })
  type: LocationsTypeEnum;

  @Column({ nullable: true, type: 'float' })
  inMiles: number;

  @Column({ nullable: true })
  to: number;

  @Column({
    type: 'enum',
    enum: LocationsToTypesEnum,
    nullable: true,
  })
  toType: LocationsToTypesEnum;

  @OneToMany(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) => jobSitesWasteStreams.jobSite,
    { nullable: true },
  )
  jobSitesWasteStreams: JobSitesWasteStreamsEntity[];

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

  entityType: number;
  typeLabel: string | undefined;

  @AfterLoad()
  getEntityType() {
    this.entityType = LocationsToTypesEnum['location'];
    this.typeLabel = this.getLocationTypeKeyByValue(this.type);
  }

  getLocationTypeKeyByValue(
    value: LocationsTypeEnum,
  ): keyof LocationsTypeEnum | undefined {
    for (const key of Object.keys(LocationsTypeEnum)) {
      if (LocationsTypeEnum[key] === value) {
        return key as keyof LocationsTypeEnum; // Type assertion might be needed
      }
    }
    return undefined;
  }
}
