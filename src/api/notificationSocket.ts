import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './apiConfig';

export interface SocketNotificationPayload {
  id: number | string;
  not_id?: number | string;
  title?: string;
  not_cat_name?: string;
  message?: string;
  entity_type?: string | null;
  entity_id?: string | number | null;
  user_type?: 'staff' | 'patient';
  user_id?: string | number;
  created_at?: string;
}

let notificationSocket: Socket | null = null;

const socketUrl = () => BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

export function getNotificationSocket(): Socket {
  if (!notificationSocket) {
    notificationSocket = io(socketUrl(), {
      transports: ['websocket'],
      reconnection: true,
      withCredentials: true,
    });
  }
  return notificationSocket;
}

export function disconnectNotificationSocket() {
  notificationSocket?.disconnect();
  notificationSocket = null;
}
