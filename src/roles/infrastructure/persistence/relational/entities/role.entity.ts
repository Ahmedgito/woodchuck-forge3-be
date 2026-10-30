import { AfterLoad, Column, Entity, PrimaryColumn } from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Role } from '../../../../domain/role';
import { RoleEnum } from 'src/roles/roles.enum';

@Entity({
  name: 'role',
})
export class RoleEntity extends EntityRelationalHelper implements Role {
  @PrimaryColumn()
  id: number;

  @Column()
  name?: string;

  enum?: string;

  @AfterLoad()
  setEnum() {
    this.enum = Object.keys(RoleEnum).find((key) => RoleEnum[key] === this.id);
  }
}
