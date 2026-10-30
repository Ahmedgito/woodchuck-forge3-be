import { SmsDumpster } from 'src/sms-dumpster/domain/sms-dumpster';

export class Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  data: JSON | null;
  smsDumpster: SmsDumpster | null;
}
