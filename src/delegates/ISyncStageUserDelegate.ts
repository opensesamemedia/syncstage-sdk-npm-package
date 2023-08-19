import { IConnection } from '../models/ISession';

export default interface ISyncStageUserDelegate {
  userJoined(connection: IConnection): void;
  userLeft(identifier: string): void;
  userMuted(identifier: string): void;
  userUnmuted(identifier: string): void;
  sessionRecordingStarted(): void;
  sessionRecordingStopped(): void;
  sessionOut(): void;
}
