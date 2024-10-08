import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IServerInstance, IServerInstances } from './models/IServerInstances';
import { ILatencyOptimizationLevel } from './models/ILatencyOptimizationLevel';
import ISessionSettings from './models/ISessionSettings';
import LatencyOptimizationLevel from './LatencyOptimizationLevel';

export default interface ISyncStage {
  connectivityDelegate: ISyncStageConnectivityDelegate | null;
  userDelegate: ISyncStageUserDelegate | null;
  isCompatible(currentOs: string): Promise<boolean>;
  getLatestCompatibleDesktopAgentVersion(currentOs: string): Promise<string | null>;
  init(jwt: string): Promise<SyncStageSDKErrorCode>;
  updateToken(jwt: string): Promise<SyncStageSDKErrorCode>;
  updateOnDesktopAgentReconnected(onDesktopAgentReconnected: () => void): void;
  isDesktopAgentConnected(): boolean;
  getSDKVersion(): string;
  getServerInstances(): Promise<[IServerInstances | null, SyncStageSDKErrorCode]>;
  createSession(
    userId: string,
    zoneId?: string | null,
    studioServerId?: string | null,
  ): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]>;
  join(
    sessionCode: string,
    userId: string,
    displayName?: string | null,
    zoneId?: string | null,
    studioServerId?: string | null,
  ): Promise<[ISession | null, SyncStageSDKErrorCode]>;
  leave(): Promise<SyncStageSDKErrorCode>;
  session(): Promise<[ISession | null, SyncStageSDKErrorCode]>;
  changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode>;
  getReceiverVolume(identifier: string): Promise<[number | null, SyncStageSDKErrorCode]>;
  toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode>;
  isMicrophoneMuted(): Promise<[boolean | null, SyncStageSDKErrorCode]>;
  getReceiverMeasurements(identifier: string): Promise<[IMeasurements | null, SyncStageSDKErrorCode]>;
  getTransmitterMeasurements(): Promise<[IMeasurements | null, SyncStageSDKErrorCode]>;
  getDesktopAgentProtocolHandler(): Promise<string>;
  getSelectedServer(): Promise<[IServerInstance | null, SyncStageSDKErrorCode]>;
  checkProvisionedStatus(): Promise<boolean>;
  getBestAvailableServer(): Promise<[IServerInstance | null, SyncStageSDKErrorCode]>;
  getSessionSettings(): Promise<[ISessionSettings | null, SyncStageSDKErrorCode]>;
  setInputDevice(identifier: number): Promise<SyncStageSDKErrorCode>;
  setOutputDevice(identifier: number): Promise<SyncStageSDKErrorCode>;
  setNoiseCancellation(enabled: boolean): Promise<SyncStageSDKErrorCode>;
  setDisableGain(disabled: boolean): Promise<SyncStageSDKErrorCode>;
  setDirectMonitor(enabled: boolean): Promise<SyncStageSDKErrorCode>;
  setLatencyOptimizationLevel(level: LatencyOptimizationLevel): Promise<SyncStageSDKErrorCode>;
}
