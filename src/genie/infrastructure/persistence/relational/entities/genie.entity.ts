import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Genie } from 'src/genie/domain/genie';

@Entity({ name: 'genie' })
export class GenieEntity extends EntityRelationalHelper implements Genie {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('IDX_genie_value', { unique: true })
  @Column({ type: 'text', unique: true })
  value: string;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

