import { IConnection } from '../models/ISession';

export default interface ISyncStageDesktopAgentDelegate {
  desktopAgentAquired(): void;
  desktopAgentReleased(): void;
}
