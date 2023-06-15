import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IServerInstance, IServerInstances } from './models/IServerInstances';
import ISyncStageDiscoveryDelegate from './delegates/ISyncStageDiscoveryDelegate';
import { IZoneLatency } from './models/IZoneLatency';

export default interface ISyncStage {
  connectivityDelegate: ISyncStageConnectivityDelegate | null;
  userDelegate: ISyncStageUserDelegate | null;
  discoveryDelegate: ISyncStageDiscoveryDelegate | null;
  init(applicationSecretId: string, applicationSecretKey: string): Promise<SyncStageSDKErrorCode>;
  isDesktopAgentConnected(): boolean;
  getSDKVersion(): string;
  getBestAvailableServer(): Promise<[IServerInstance | null, SyncStageSDKErrorCode]>;
  getServerInstances(): Promise<[IServerInstances | null, SyncStageSDKErrorCode]>;
  createSession(zoneId: string, studioServerId: string, userId: string): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]>;
  join(
    sessionCode: string,
    userId: string,
    zoneId: string,
    studioServerId: string,
    displayName?: string | null,
  ): Promise<[ISession | null, SyncStageSDKErrorCode]>;
  leave(): Promise<SyncStageSDKErrorCode>;
  session(): Promise<[ISession | null, SyncStageSDKErrorCode]>;
  changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode>;
  getReceiverVolume(identifier: string): Promise<[number | null, SyncStageSDKErrorCode]>;
  toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode>;
  isMicrophoneMuted(): Promise<[boolean | null, SyncStageSDKErrorCode]>;
  getReceiverMeasurements(identifier: string): Promise<[IMeasurements | null, SyncStageSDKErrorCode]>;
  getTransmitterMeasurements(): Promise<[IMeasurements | null, SyncStageSDKErrorCode]>;
  getLatencyOptimizationLevel(): Promise<[IZoneLatency | null, SyncStageSDKErrorCode]>;
}
