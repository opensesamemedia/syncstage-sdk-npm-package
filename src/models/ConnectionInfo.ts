import { IHostInfo, IConnectionInfo } from "./IConnectionInfo";
import { Connection } from "./Session";

export class HostInfo implements IHostInfo {
  constructor(public port: number, public address: string, public audioServerId: string, public streamingUrl: string) {}
}

export default class ConnectionInfo implements IConnectionInfo {
  constructor(
    public connectionId: string,
    public createdAt: string,
    public updatedAt: string,
    public userId: string,
    public isMuted: boolean,
    public displayName: string | null = null,
    public hostInfo: IHostInfo | null = null,
  ) {}

  connection(): Connection {
    return new Connection(
      this.connectionId,
      this.userId,
      this.isMuted,
      this.createdAt,
      this.updatedAt,
      this.displayName,
    );
  }
}
