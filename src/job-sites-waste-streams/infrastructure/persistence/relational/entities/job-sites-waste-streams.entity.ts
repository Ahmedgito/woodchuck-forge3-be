import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { WasteStreamsEntity } from '../../../../../wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';
import { LocationsEntity } from '../../../../../locations/infrastructure/persistence/relational/entities/locations.entity';
import { DumpsterEntity } from '../../../../../dumpster/infrastructure/persistence/relational/entities/dumpster.entity';
import { HaulerEntity } from '../../../../../haulers/infrastructure/persistence/relational/entities/hauler.entity';
import { DumpsterTypeEnum } from '../../../../dumpsterType.enum';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { JobSiteWasteStreams } from 'src/job-sites-waste-streams/domain/job-sites-waste-streams';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { Hauler } from 'src/haulers/domain/hauler';
import { Locations } from 'src/locations/domain/locations';
import { JobSite } from 'src/job-sites/domain/job-site';
import { Dumpster } from 'src/dumpster/domain/dumpster';
import { WasteStreams } from 'src/wastestreams/domain/wastestreams';
import { JobSiteWastestreamsDumpstersEntity } from 'src/job-sites-wastestreams-dumpsters/infrastructure/persistence/relational/entities/job-site-wastestreams-dumpsters.entity';
import { LocationsTypeEnum } from 'src/locations/locationTypes.enum';
import { PowerPlantsEntity } from 'src/power-plants/infrastructure/persistence/relational/entities/power-plants.entity';
import { PowerPlants } from 'src/power-plants/domain/power-plants';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import { JobsiteWasteStreamLocationsEntity } from 'src/job-site-waste-stream-locations/infrastructure/persistence/relational/entities/job-site-waste-stream-locations.entity';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { WasteStreamTypes } from 'src/wastestream-types/domain/wastestream-types';
import { DecimalColumnTransformer } from 'src/utils/transformers/decimal-column.transformer';
import { VesselOptionsEntity } from 'src/vessel-options/infrastructure/persistence/relational/entities/vessel-options.entity';
import { VesselEntity } from 'src/vessels/infrastructure/persistence/relational/entities/vessel.entity';
import { WasteStreamImageEntity } from 'src/waste-stream-images/infrastructure/persistence/relational/entities/waste-stream-image.entity';

@Entity({
  name: 'jobsites_wastestreams',
})
export class JobSitesWasteStreamsEntity
  extends EntityRelationalHelper
  implements JobSiteWasteStreams
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: DumpsterTypeEnum,
  })
  dumpster_type: DumpsterTypeEnum;

  @Column('float')
  distance: number;

  @Index()
  @ManyToOne(() => JobSiteEntity, (jobSite) => jobSite.jobSitesWasteStreams, {
    eager: true,
  })
  @JoinColumn()
  jobSite: JobSiteEntity;

  @Index()
  @ManyToOne(
    () => WasteStreamsEntity,
    (wasteStream) => wasteStream.jobSitesWasteStreams,
    { eager: true },
  )
  @JoinColumn()
  wasteStream: WasteStreamsEntity;

  @Index()
  @ManyToOne(
    () => LocationsEntity,
    (location) => location.jobSitesWasteStreams,
    { eager: true, nullable: true },
  )
  location: LocationsEntity | null;

  @Index()
  @ManyToOne(
    () => PowerPlantsEntity,
    (powerplant) => powerplant.jobSitesWasteStreams,
    { eager: true, nullable: true },
  )
  powerplant: PowerPlantsEntity | null;

  @Index()
  @ManyToOne(
    () => DumpsterEntity,
    (dumpster) => dumpster.jobSitesWasteStreams,
    { eager: true },
  )
  @JoinColumn()
  dumpster: DumpsterEntity;

  @Index()
  @ManyToOne(() => HaulerEntity, (hauler) => hauler.jobSitesWasteStreams, {
    eager: true,
  })
  @JoinColumn()
  hauler: HaulerEntity;

  @OneToMany(
    () => JobSiteWastestreamsDumpstersEntity,
    (jobSitesWasteStreamsDumpsters) =>
      jobSitesWasteStreamsDumpsters.jobSiteWastestreams,
    {
      onDelete: 'SET NULL',
    },
  )
  jobSitesWasteStreamsDumpsters?: JobSiteWastestreamsDumpstersEntity[];

  @Index()
  @ManyToOne(
    () => WasteStreamTypesEntity,
    (wasteStreamType) => wasteStreamType.jobSitesWasteStreams,
    { eager: true },
  )
  @JoinColumn()
  wasteStreamType: WasteStreamTypesEntity;

  @OneToOne(
    () => WasteStreamCamerasEntity,
    (wasteStreamCameras) => wasteStreamCameras.jobsiteWasteStream,
  )
  wasteStreamCameras: WasteStreamCamerasEntity;

  @OneToMany(
    () => JobsiteWasteStreamLocationsEntity,
    (wasteStreamLocations) => wasteStreamLocations.jobsiteWasteStream,
    {
      cascade: true,
      eager: false,
    },
  )
  wasteStreamLocations: JobsiteWasteStreamLocationsEntity[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  co2: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  recycling_rebate: number | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  reports_enabled: boolean;

  @Column({ type: 'int', nullable: true })
  order: number | null;

  @Column({ nullable: true })
  vesselId: number;

  @Column({ nullable: true })
  vesselOptionId: number;

  @ManyToOne(() => VesselEntity, (v) => v.jobsiteWasteStreams, {
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'vesselId' })
  vessel: VesselEntity;

  @ManyToOne(() => VesselOptionsEntity, (vo) => vo.jobsiteWasteStreams, {
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'vesselOptionId' })
  vesselOption: VesselOptionsEntity;

  @OneToMany(
    () => WasteStreamImageEntity,
    (img) => img.jobsiteWasteStream,
    { eager: false },
  )
  wasteStreamImages: WasteStreamImageEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @AfterLoad()
  getData() {
    this.haulerId = this.hauler?.id;
    this.wasteStreamId = this.wasteStream?.id;
    this.dumpsterId = this.dumpster?.id;
    this.jobSiteId = this.jobSite?.id;
    this.locationId = this.location?.id;
    this.powerplantId = this.powerplant?.id;
    this.wasteStreamTypeId = this.wasteStreamType?.id;
    this.dumpster_key = this.vessel?.name;
    this.dumpster_weight = `${this.vesselOption?.value}yd`;
  }
  haulerId: Hauler['id'];
  wasteStreamId: WasteStreams['id'];
  dumpsterId: Dumpster['id'];
  jobSiteId: JobSite['id'];
  locationId: Locations['id'] | undefined;
  powerplantId: PowerPlants['id'] | undefined;
  dumpster_key: string;
  dumpster_weight: string | null;
  wasteStreamTypeId: WasteStreamTypes['id'];

  getJobsiteWastestreamDumpstersTotalWeight(isNotLandfill?) {
    let totalWeight: number = 0;
    if (this.jobSitesWasteStreamsDumpsters !== undefined) {
      const processingLocation = this.wasteStreamLocations?.find(
        (loc) => loc.type === 1,
      );
      if (processingLocation) {
        if (isNotLandfill != undefined && isNotLandfill == true) {
          if (
            processingLocation.location?.type === LocationsTypeEnum.Landfill
          ) {
            return totalWeight;
          }
        }
      }
      for (const val of this.jobSitesWasteStreamsDumpsters) {
        totalWeight +=
          val.real_weight != null
            ? Number(val.real_weight)
            : Number(val.estimated_weight);
      }
    }
    return totalWeight;
  }

  calculateEstWeight() {
    if (!this.vesselId || !this.vesselOptionId || !this.wasteStream) {
      return 0;
    }

    // Get the selected vessel option (yard size)
    const vesselOption = this.vesselOption;
    const yardSize = vesselOption?.value ?? 0;

    // Get tons value from wastestream_type_vessels association
    const typeVessel = this.wasteStreamType.vessels?.find(
      (v) => v.vesselId === this.vesselId,
    );

    if (!typeVessel) {
      return 0;
    }

    // Tons is "tons per yard" stored in wastestream_type_vessels
    const tonsPerYard = Number(typeVessel.tons ?? 0);
    // Calculate estimated weight
    const estWeight = Number((tonsPerYard * yardSize).toFixed(2));
    return estWeight;
  }
}
