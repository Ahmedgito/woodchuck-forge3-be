import { HaulerType } from 'src/haulertype/domain/haulertype';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity({
  name: 'haulerType',
})
export class HaulerTypeEntity
  extends EntityRelationalHelper
  implements HaulerType
{
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ nullable: false })
  name: string;
  @Column({ nullable: false })
  unit: string;
}
