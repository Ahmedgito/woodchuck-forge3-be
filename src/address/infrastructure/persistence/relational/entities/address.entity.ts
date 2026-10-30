import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';
import { Address } from '../../../../domain/address';

@Entity({
  name: 'address',
})
export class AddressEntity extends EntityRelationalHelper implements Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String, nullable: false })
  addressFull: string;

  @Column({ type: String, nullable: false })
  addressLine1: string;

  @Column({ type: String, nullable: true })
  addressLine2: string | null;

  @Column({ type: String, nullable: false })
  city: string;

  @Column({ type: String, nullable: false })
  state: string;

  @Column({ type: String, nullable: false })
  postalCode: string;

  @Column({ type: String, nullable: false })
  country: string;

  @Column({ type: String, nullable: true })
  placeId: string | null;

  @Index()
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: false,
    name: 'lat',
  })
  lat: number;

  @Index()
  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: false,
    name: 'lng',
  })
  lng: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
