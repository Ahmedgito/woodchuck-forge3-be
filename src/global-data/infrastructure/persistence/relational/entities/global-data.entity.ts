import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

//   import { Exclude, Expose } from 'class-transformer';
import { GlobalData } from '../../../../domain/global-data';
import { DecimalColumnTransformer } from 'src/utils/transformers/decimal-column.transformer';

@Entity({
  name: 'global_data',
})
export class GlobalDataEntity
  extends EntityRelationalHelper
  implements GlobalData
{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  distanceMmrMacomb: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  distanceMmrLivonia: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  tonage10yrd: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  tonage20yrd: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  tonage30yrd: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  tonage40yrd: number | null;

  @Column({ type: String, nullable: true })
  supervisorOnboarding: string | null;

  @Column({ type: String, nullable: true })
  autoResponse: string | null;
}
