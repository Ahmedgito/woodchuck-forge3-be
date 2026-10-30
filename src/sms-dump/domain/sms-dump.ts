export class SmsDump {
  id?: number;
  sender?: string | null;
  receiver?: string | null;
  message?: JSON | null;
  createdAt: Date;
}
