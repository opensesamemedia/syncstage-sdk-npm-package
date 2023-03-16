import { IConnection, ISession, ISessionIdentifier } from "./ISession";

export class SessionIdentifier implements ISessionIdentifier {
  constructor(public sessionId: string, public sessionCode: string, public createdAt: string) {}
}

export class Session implements ISession {
  constructor(
    public sessionId: string,
    public createdAt: string,
    public updatedAt: string,
    public transmitter: IConnection | null = null,
    public receivers: Array<IConnection> = [],
  ) {}
}

export class Connection implements IConnection {
  constructor(
    public identifier: string,
    public userId: string,
    public isMuted: boolean,
    public createdAt: string,
    public updatedAt: string,
    public displayName: string | null = null,
  ) {}
}
