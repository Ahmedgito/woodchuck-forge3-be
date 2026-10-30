import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { WasteStreamActivityMapping } from 'src/waste-stream-activity-mapping/domain/waste-stream-activity-mapping';

@Entity({
  name: 'waste_stream_activity_mapping',
})
@Unique(['wasteStreamName'])
export class WasteStreamActivityMappingEntity
  extends EntityRelationalHelper
  implements WasteStreamActivityMapping
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  wasteStreamName: string;

  @Column({ type: 'varchar', length: 255 })
  activity: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
