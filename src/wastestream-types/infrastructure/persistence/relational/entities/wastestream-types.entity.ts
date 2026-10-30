import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WasteStreamTypes } from 'src/wastestream-types/domain/wastestream-types';
import { WasteStreamsEntity } from 'src/wastestreams/infrastructure/persistence/relational/entities/wastestreams.entity';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { WasteStreamTypeVesselsEntity } from 'src/wastestream-type-vessels/infrastructure/persistence/relational/entities/wastestream-type-vessels.entity';

@Entity({
  name: 'wastestream_types',
})
export class WasteStreamTypesEntity
  extends EntityRelationalHelper
  implements WasteStreamTypes
{
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  colorCodeEst: string;

  @Column({ nullable: true })
  colorCodeReal: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({
    type: Number,
  })
  wasteStreamId: WasteStreamsEntity['id'];

  @Index()
  @ManyToOne(
    () => WasteStreamsEntity,
    (wasteStream) => wasteStream.wasteStreamTypes,
  )
  @JoinColumn()
  wasteStream: WasteStreamsEntity;

  @OneToMany(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) => jobSitesWasteStreams.jobSite,
  )
  jobSitesWasteStreams: JobSitesWasteStreamsEntity[];

  @OneToMany(
    () => WasteStreamTypeVesselsEntity,
    (wstv) => wstv.wasteStreamType,
    {
      cascade: true,
      eager: true,
    },
  )
  vessels: WasteStreamTypeVesselsEntity[];
}
