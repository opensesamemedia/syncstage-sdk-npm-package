import { IConnection } from '../models/ISession';
import { IZoneLatency } from '../models/IZoneLatency';

export default interface ISyncStageDiscoveryDelegate {
  discoveryResults(zones: string[]): void;
  discoveryLatencyTestResults(results: IZoneLatency[]): void;
}
