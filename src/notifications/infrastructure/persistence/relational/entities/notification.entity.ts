import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  AfterLoad,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { Notification } from 'src/notifications/domain/notification';
import { SmsDumpsterEntity } from 'src/sms-dumpster/infrastructure/persistence/relational/entities/sms-dumpster.entity';
import { SmsDumpster } from 'src/sms-dumpster/domain/sms-dumpster';

@Entity({
  name: 'notifications',
})
export class NotificationEntity
  extends EntityRelationalHelper
  implements Notification
{
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: JSON;

  @Column({ type: 'boolean', default: 'false' })
  isRead: boolean;

  smsDumpster: SmsDumpster | null;

  @AfterLoad()
  async getSmsDumpster() {
    this.smsDumpster = await SmsDumpsterEntity.findOneBy({
      id: this.data['smsDumpsterId'],
    });
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
