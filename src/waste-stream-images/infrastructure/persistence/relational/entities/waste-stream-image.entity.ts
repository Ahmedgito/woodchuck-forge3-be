import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { AiStatus } from '../../../../enums/ai-status.enum';
import { ImageMetadataSource } from '../../../../enums/image-metadata-source.enum';
import { JobSitesWasteStreamsEntity } from 'src/job-sites-waste-streams/infrastructure/persistence/relational/entities/job-sites-waste-streams.entity';
import { FileEntity } from 'src/files/infrastructure/persistence/relational/entities/file.entity';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Entity({ name: 'waste_stream_images' })
export class WasteStreamImageEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  jobsiteWasteStreamId: number;

  @Index()
  @Column({ type: 'int' })
  jobSiteId: number;

  @Index()
  @Column({ type: 'int' })
  wasteStreamId: number;

  @Column({ type: 'uuid' })
  fileId: string;

  @Index()
  @Column({ type: 'int' })
  uploadedById: number;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  uploadedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  capturedAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  metadataSource: ImageMetadataSource | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceFromJobSiteMeters: number | null;

  @Column({ type: 'boolean', nullable: true })
  locationVerified: boolean | null;

  @Column({
    type: 'enum',
    enum: AiStatus,
    default: AiStatus.PENDING,
  })
  aiStatus: AiStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  aiConfidenceLevel: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  adminConfidenceOverride: number | null;

  @Column({ type: 'boolean', nullable: true })
  aiVerified: boolean | null;

  @Column({ type: 'jsonb', nullable: true })
  aiResponseRaw: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  isLatest: boolean;

  @Column({ type: 'uuid', nullable: true })
  replacedById: string | null;

  @Column({ type: 'int', default: 1 })
  displayOrder: number;

  // Relations (not eager — loaded on demand to keep response payloads slim)
  @ManyToOne(
    () => JobSitesWasteStreamsEntity,
    (jws) => jws.wasteStreamImages,
    { nullable: false, onDelete: 'RESTRICT' },
  )
  @JoinColumn({ name: 'jobsiteWasteStreamId' })
  jobsiteWasteStream: JobSitesWasteStreamsEntity;

  @ManyToOne(() => FileEntity, { nullable: false, eager: true })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @ManyToOne(() => UserEntity, { nullable: false, eager: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
