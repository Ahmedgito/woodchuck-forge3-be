import {
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AlertToType } from '../../../../alertToType.enum';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';
import { Camera } from 'src/cameras/domain/camera';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { WasteStreamCameras } from 'src/wastestream-cameras/domain/wastestream-cameras';
import { JobSiteWasteStreams } from 'src/job-sites-waste-streams/domain/job-sites-waste-streams';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';
import { HaulerEntity } from 'src/haulers/infrastructure/persistence/relational/entities/hauler.entity';

@Entity({
  name: 'wastestream_cameras',
})
export class WasteStreamCamerasEntity
  extends EntityRelationalHelper
  implements WasteStreamCameras
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column('float')
  maxLevel: number;

  @Column({
    type: Number,
  })
  alertTo: number;

  @Column({
    type: Number,
  })
  additionalCameraId: Camera['id'];

  @Column({
    type: Number,
    nullable: true,
  })
  confidenceLevel?: number;

  @Column({
    type: Number,
  })
  cameraId: Camera['id'];

  @Column({
    type: 'enum',
    enum: AlertToType,
  })
  alertToType: AlertToType;

  @Column({
    type: Number,
  })
  jobsiteWasteStreamId: JobSiteWasteStreams['id'];

  @Index()
  @OneToOne(
    () => JobSitesWasteStreamsEntity,
    (jobsiteWasteStream) => jobsiteWasteStream.wasteStreamCameras,
  )
  @JoinColumn()
  jobsiteWasteStream: JobSitesWasteStreamsEntity;

  @Index()
  @OneToOne(() => CameraEntity, (camera) => camera.wasteStreamCamera, {
    eager: true,
  })
  @JoinColumn()
  camera: CameraEntity;

  @Index()
  @OneToOne(
    () => CameraEntity,
    (additionalCamera) => additionalCamera.wasteStreamAdditionalCamera,
    {
      eager: true,
    },
  )
  @JoinColumn()
  additionalCamera: CameraEntity;

  @ManyToOne(() => UserEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'alertTo', referencedColumnName: 'id' })
  alertToUser?: UserEntity;

  @ManyToOne(() => HaulerEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'alertTo', referencedColumnName: 'id' })
  alertToHauler?: HaulerEntity;

  @AfterLoad()
  getIds() {
    this.jobsiteWasteStreamId = this.jobsiteWasteStream?.id;
    this.cameraId = this.camera?.id;
    this.additionalCameraId = this.additionalCamera?.id;

    if (this.alertToType === AlertToType.SUPERVISOR) {
      this.alertToName = this.jobsiteWasteStream?.jobSite?.name ?? null;
      this.alertToUser = undefined as any;
    } else if (this.alertToType === AlertToType.HAULER) {
      this.alertToName = this.alertToHauler?.name ?? null;
      this.alertToHauler = undefined as any;
    }
  }
  alertToName: string | null = null;
}
