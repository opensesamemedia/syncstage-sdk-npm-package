import { IServerInstance } from '../models/IServerInstances';
import { IZoneLatency } from '../models/IZoneLatency';

export default interface ISyncStageDiscoveryDelegate {
  discoveryResults(zones: string[]): void;
  discoveryLatencyTestResults(results: IZoneLatency[]): void;
  serverSelected(selectedServer: IServerInstance): void;
}
