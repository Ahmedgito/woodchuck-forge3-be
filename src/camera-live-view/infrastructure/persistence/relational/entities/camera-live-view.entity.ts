import { CameraLiveView } from 'src/camera-live-view/domain/camera-live-view';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'camera_live_view',
})
export class CameraLiveViewEntity
  extends EntityRelationalHelper
  implements CameraLiveView
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String })
  s3ImageUrl: string | null;

  @Column('float')
  fillPercentage: number | null;

  @Column({ type: String })
  cameraId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: Number, nullable: true })
  captureCount: number | null;

  @Column({ type: 'boolean', default: 'true' })
  isOnline: boolean | null;

  @Column({ type: String, nullable: true })
  captureDatetime: string | null;

  @Column('float')
  folio3FillPercentage: number | null;

  @Column({ type: 'boolean', default: 'false' })
  enableRefresh: boolean | null;

  @Column({ type: 'boolean', default: 'false' })
  isPolluted: boolean | null;

  @Column('float')
  folio3ConfidenceLevel: number | null;
}
