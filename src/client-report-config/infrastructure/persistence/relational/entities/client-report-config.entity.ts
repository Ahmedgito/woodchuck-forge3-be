import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { ClientReportConfig } from 'src/client-report-config/domain/client-report-config';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Entity({
  name: 'client_report_config',
})
@Unique(['client'])
export class ClientReportConfigEntity
  extends EntityRelationalHelper
  implements ClientReportConfig
{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { eager: true })
  client: UserEntity;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
