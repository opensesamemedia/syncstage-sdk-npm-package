import { IConnectionInfo } from './IConnectionInfo';
import { IConnection, ISession } from './ISession';
import { ISessionInfo } from './ISessionInfo';
import { Session } from './Session';

export default class SessionInfo implements ISessionInfo {
  constructor(
    public sessionId: string,
    public sessionStatus: string,
    public serverIsReady: boolean,
    public websocketUrl: string,
    public receivers: Array<IConnectionInfo>,
    public createdAt: string,
    public updatedAt: string,
    public transmitter: IConnectionInfo | null = null,
  ) {}

  session(): ISession {
    const transmitter: IConnection | undefined = this.transmitter?.connection();
    const receivers: Array<IConnection> = this.receivers.map((connectionInfo) => connectionInfo.connection());
    return new Session(this.sessionId, this.createdAt, this.updatedAt, transmitter, receivers);
  }
}
