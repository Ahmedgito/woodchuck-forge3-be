import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VesselEntity } from 'src/vessels/infrastructure/persistence/relational/entities/vessel.entity';
import { WasteStreamTypesEntity } from 'src/wastestream-types/infrastructure/persistence/relational/entities/wastestream-types.entity';
import { WasteStreamTypeVessels } from 'src/wastestream-type-vessels/domain/wastestream-type-vessels';

@Entity({
  name: 'wastestream_type_vessels',
})
export class WasteStreamTypeVesselsEntity
  extends EntityRelationalHelper
  implements WasteStreamTypeVessels
{
  @PrimaryColumn()
  id: number;

  @Column()
  wasteStreamTypeId: number;

  @Column()
  vesselId: number;

  @Column('float', { default: 0 })
  tons: number;

  @ManyToOne(() => WasteStreamTypesEntity, (type) => type.vessels, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wasteStreamTypeId' })
  wasteStreamType: WasteStreamTypesEntity;

  @ManyToOne(() => VesselEntity, (vessel) => vessel.wasteStreamTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'vesselId' })
  vessel: VesselEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
