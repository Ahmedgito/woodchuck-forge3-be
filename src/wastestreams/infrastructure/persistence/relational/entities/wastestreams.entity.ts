import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { WasteStreams } from 'src/wastestreams/domain/wastestreams';
import {
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobSitesWasteStreamsEntity } from '../../../../../job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { Exclude } from 'class-transformer';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';

@Entity({
  name: 'wastestreams',
})
export class WasteStreamsEntity
  extends EntityRelationalHelper
  implements WasteStreams
{
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true, type: 'float' })
  tonPerOffRoleYard: number;

  @Column({ nullable: true, type: 'float' })
  tonPerFrontLoadYard: number;

  @Column({ nullable: true, type: 'float' })
  tonPerCompactorYard: number;

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

  @OneToMany(
    () => JobSitesWasteStreamsEntity,
    (jobSitesWasteStreams) => jobSitesWasteStreams.jobSite,
  )
  jobSitesWasteStreams: JobSitesWasteStreamsEntity[];

  @OneToMany(
    () => WasteStreamTypesEntity,
    (wasteStreamTypes) => wasteStreamTypes.wasteStream,
  )
  wasteStreamTypes: WasteStreamTypesEntity[];

  @Exclude()
  isDirty: boolean;

  @BeforeUpdate()
  async setEstValues(): Promise<void> {
    const originalEntity = await WasteStreamsEntity.findOne({
      where: { id: this.id },
    });

    if (
      originalEntity &&
      (this.tonPerCompactorYard !== originalEntity.tonPerCompactorYard ||
        this.tonPerFrontLoadYard !== originalEntity.tonPerFrontLoadYard ||
        this.tonPerOffRoleYard !== originalEntity.tonPerOffRoleYard)
    ) {
      // Name has changed, handle dirty state
      this.isDirty = true;
    }
  }
}
