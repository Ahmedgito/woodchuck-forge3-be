import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SmsDumpsterNotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  @SubscribeMessage('msgToServer')
  handleMessage(client: any, payload: any): string {
    this.server.emit('requestNotification', payload);
    return 'Message received: ' + payload;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleConnection(client: any, ...args: any[]) {
    console.log('Client connected:', client.id);
    this.server.emit('msgFromServer', [{ message: 'Client connected' }]);
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected:', client.id);
  }
}
