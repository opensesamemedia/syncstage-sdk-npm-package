import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IZonesList } from './models/IZonesList';

export default interface ISyncStage {
  connectivityDelegate: ISyncStageConnectivityDelegate | null;
  userDelegate: ISyncStageUserDelegate | null;
  init(applicationSecretId: string, applicationSecretKey: string): Promise<SyncStageSDKErrorCode>;
  isDesktopAgentConnected(): boolean;
  getSDKVersion(): string;
  zonesList(): Promise<[IZonesList | null, SyncStageSDKErrorCode]>;
  createSession(zoneId: string, userId: string): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]>;
  join(
    sessionCode: string,
    userId: string,
    displayName?: string | null,
    latitude?: number | null,
    longitude?: number | null,
  ): Promise<[ISession | null, SyncStageSDKErrorCode]>;
  leave(): Promise<SyncStageSDKErrorCode>;
  session(): Promise<[ISession | null, SyncStageSDKErrorCode]>;
  changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode>;
  getReceiverVolume(identifier: string): Promise<[number | null, SyncStageSDKErrorCode]>;
  toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode>;
  isMicrophoneMuted(): Promise<[boolean | null, SyncStageSDKErrorCode]>;
  getReceiverMeasurements(identifier: string): Promise<[IMeasurements | null, SyncStageSDKErrorCode]>;
  getTransmitterMeasurements(): Promise<[IMeasurements | null, SyncStageSDKErrorCode]>;
  registerDesktopAgentReconnectedCallback(onWebsocketReconnected: () => void): void;
  unregisterDesktopAgentReconnectedCallback(): void;
}
