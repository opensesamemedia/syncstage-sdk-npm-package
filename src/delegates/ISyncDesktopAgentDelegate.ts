export default interface ISyncStageDesktopAgentDelegate {
  desktopAgentAquired(): void;
  desktopAgentReleased(): void;
  desktopAgentConnected(): void;
  desktopAgentDisconnected(): void;
  desktopAgentConnectionKeepAlive(): void;
  desktopAgentLostConnection(): void;
}
