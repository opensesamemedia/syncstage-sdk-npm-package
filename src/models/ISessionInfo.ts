import { IConnectionInfo } from './IConnectionInfo';

export interface ISessionInfo {
  sessionId: string;
  sessionCode: string | null;
  sessionStatus: string;
  serverIsReady: boolean;
  websocketUrl: string;
  transmitter?: IConnectionInfo | null;
  receivers: Array<IConnectionInfo>;
  createdAt: string;
  updatedAt: string;
  recordingStatus: string;
}
