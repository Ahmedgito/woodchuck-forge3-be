import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { UserEntity } from 'src/users/infrastructure/persistence/relational/entities/user.entity';

@Entity({ name: 'impersonation_log' })
export class ImpersonationLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  @Index()
  superAdmin: UserEntity;

  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  @Index()
  targetUser: UserEntity;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @DeleteDateColumn()
  deletedAt: Date;
}
