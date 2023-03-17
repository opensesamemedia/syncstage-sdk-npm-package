export default interface ISyncStageConnectivityDelegate {
  transmitterConnectivityChanged(connected: boolean): void;
  receiverConnectivityChanged(identifier: string, connected: boolean): void;
}
