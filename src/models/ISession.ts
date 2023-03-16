export interface ISessionIdentifier {
  sessionId: string;
  sessionCode: string;
  createdAt: string;
}

export interface ISession {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  transmitter?: IConnection | null;
  receivers: Array<IConnection>;
}

export interface IConnection {
  identifier: string;
  userId: string;
  displayName?: string | null;
  isMuted: boolean;
  createdAt: string;
  updatedAt: string;
}
