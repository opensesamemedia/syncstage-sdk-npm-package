export interface ISessionIdentifier {
  sessionId: string;
  sessionCode: string;
  createdAt: string;
}

export interface ISession {
  sessionId: string;
  sessionCode: string | null;
  createdAt: string;
  updatedAt: string;
  transmitter?: IConnection | null;
  receivers: Array<IConnection>;
  isRecording: boolean;
}

export interface IConnection {
  identifier: string;
  userId: string;
  displayName?: string | null;
  isMuted: boolean;
  createdAt: string;
  updatedAt: string;
}
