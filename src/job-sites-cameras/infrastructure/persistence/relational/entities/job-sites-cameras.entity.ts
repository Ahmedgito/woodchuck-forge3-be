import {
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AlertToType } from '../../../../alertToType.enum';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { JobSiteCameras } from 'src/job-sites-cameras/domain/job-sites-cameras';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';
import { JobSite } from 'src/job-sites/domain/job-site';
import { CameraEntity } from 'src/cameras/infrastructure/persistence/relational/entities/camera.entity';
import { Camera } from 'src/cameras/domain/camera';

@Entity({
  name: 'job_site_cameras',
})
export class JobSitesCamerasEntity
  extends EntityRelationalHelper
  implements JobSiteCameras
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: String,
  })
  name: string;

  @Column('float')
  maxLevel: number;

  @Column({
    type: Number,
  })
  alertTo: number;

  @Column({
    type: Number,
  })
  cameraId: Camera['id'];

  @Column({
    type: Number,
  })
  jobSiteId: JobSite['id'];

  @Column({
    type: 'enum',
    enum: AlertToType,
  })
  alertToType: AlertToType;

  @Index()
  @ManyToOne(() => JobSiteEntity, (jobSite) => jobSite.jobSitesCameras, {
    eager: true,
  })
  @JoinColumn()
  jobSite: JobSiteEntity;

  @Index()
  @ManyToOne(() => CameraEntity, (camera) => camera.jobSitesCameras, {
    eager: true,
  })
  @JoinColumn()
  camera: CameraEntity;

  @AfterLoad()
  getIds() {
    this.jobSiteId = this.jobSite?.id;
    this.cameraId = this.camera?.id;
  }

  // jobSiteId: JobSite['id'];
  // cameraId: Camera['id'];
}
