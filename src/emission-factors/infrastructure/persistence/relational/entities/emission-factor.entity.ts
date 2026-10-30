import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { EmissionFactor } from '../../../../domain/emission-factor';

@Entity({
  name: 'emission_factors',
})
export class EmissionFactorEntity
  extends EntityRelationalHelper
  implements EmissionFactor
{
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  key: string;

  @Column({ type: 'text', nullable: false })
  value: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}

