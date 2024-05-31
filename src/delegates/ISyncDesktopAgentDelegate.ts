export default interface ISyncStageDesktopAgentDelegate {
  desktopAgentAquired(): void;
  desktopAgentReleased(): void;
  desktopAgentConnected(): void;
  desktopAgentDisconnected(): void;
  onDesktopAgentRelaunched(): void;
}
