import { Connection } from './Session';

export interface IHostInfo {
  port: number;
  address: string;
  audioServerId: string;
  streamingUrl: string;
}

export interface IConnectionInfo {
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isMuted: boolean;
  displayName?: string | null;
  hostInfo?: IHostInfo | null;

  connection(): Connection;
}
