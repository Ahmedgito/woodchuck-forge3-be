import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ReportLogLevel {
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

@Entity({ name: 'report_log' })
export class ReportLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ReportLogLevel, default: ReportLogLevel.LOG })
  level: ReportLogLevel;

  @Column({ type: 'varchar', length: 100 })
  context: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
