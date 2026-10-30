import { SmsDump } from 'src/sms-dump/domain/sms-dump';
import { EntityRelationalHelper } from 'src/utils/relational-entity-helper';

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({
  name: 'sms_dump',
})
export class SmsDumpEntity extends EntityRelationalHelper implements SmsDump {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String, nullable: true })
  sender: string | null;

  @Column({ type: String, nullable: true })
  receiver: string | null;

  @Column({ type: 'json', nullable: true })
  message: JSON | null;

  @CreateDateColumn()
  createdAt: Date;
}
