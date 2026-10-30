import { Camera } from 'src/cameras/domain/camera';
import { JobSitesCamerasEntity } from 'src/job-sites-cameras/infrastructure/persistence/relational/entities/job-sites-cameras.entity';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { WasteStreamCameras } from 'src/wastestream-cameras/domain/wastestream-cameras';
import { WasteStreamCamerasEntity } from 'src/wastestream-cameras/infrastructure/persistence/relational/entities/wastestream-cameras.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'camera',
})
export class CameraEntity extends EntityRelationalHelper implements Camera {
  @PrimaryGeneratedColumn()
  id: number;

  // @Index()
  @Column({ nullable: false })
  name: string;

  @Index()
  @Column({ nullable: false })
  cameraId: string;

  @Index()
  @Column({ nullable: false })
  ipAddress: string;

  @Column({ nullable: false })
  url: string;

  @Column()
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(
    () => WasteStreamCamerasEntity,
    (jobSitesCameras) => jobSitesCameras.camera,
  )
  wasteStreamCamera: WasteStreamCamerasEntity;

  @OneToOne(
    () => WasteStreamCamerasEntity,
    (jobSitesCameras) => jobSitesCameras.additionalCamera,
  )
  wasteStreamAdditionalCamera: WasteStreamCamerasEntity;

  @OneToMany(
    () => JobSitesCamerasEntity,
    (jobSitesCameras) => jobSitesCameras.camera,
  )
  jobSitesCameras: JobSitesCamerasEntity[];
}
