export default interface ISyncStageDesktopAgentDelegate {
  desktopAgentAquired(): void;
  desktopAgentReleased(): void;
  desktopAgentConnected(): void;
  desktopAgentDisconnected(): void;
  onDesktopAgentDeprovisioned(): void;
  onDesktopAgentProvisioned(): void;
}
