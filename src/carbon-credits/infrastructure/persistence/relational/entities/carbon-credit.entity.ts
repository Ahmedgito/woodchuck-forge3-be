import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { JobSiteEntity } from 'src/job-sites/infrastructure/persistence/relational/entities/job-site.entity';

@Entity({ name: 'carbon_credit' })
@Unique('uq_carbon_credit_jobsite', ['jobSiteId'])
export class CarbonCreditEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobSiteEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobSiteId' })
  jobSite: JobSiteEntity;

  @Column()
  jobSiteId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  co2Value: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  carbonCreditDollars: number;

  @Column({ type: 'varchar', length: 20, default: 'estimated' })
  status: 'estimated' | 'confirmed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
