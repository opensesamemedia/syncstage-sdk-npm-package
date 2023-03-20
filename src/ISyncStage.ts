import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IZonesInRegionsList } from './models/IZonesIRegionsList';

export default interface ISyncStage{
    connectivityDelegate: ISyncStageConnectivityDelegate | null;
    userDelegate: ISyncStageUserDelegate | null;
    init(applicationSecretId: string, applicationSecretKey: string): Promise<SyncStageSDKErrorCode>;
    zonesList(): Promise<[IZonesInRegionsList | null, SyncStageSDKErrorCode]>;
    createSession(zoneId: string, userId: string): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]>;
    join(sessionCode: string, userId: string, displayName?: string | null, latitude?: number | null, longitude?: number | null): Promise<[ISession | null, SyncStageSDKErrorCode]>;
    leave(): Promise<SyncStageSDKErrorCode>;
    session(): Promise<[ISession | null, SyncStageSDKErrorCode]>;
    preview(sessionCode: string, userId: string): Promise<[ISession | null, SyncStageSDKErrorCode]>;
    changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode>;
    getReceiverVolume(identifier: string): Promise<number>;
    toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode>;
    isMicrophoneMuted(): Promise<boolean>;
    getReceiverMeasurements(identifier: string): Promise<IMeasurements>;
    getTransmitterMeasurements(): Promise<IMeasurements>;
  }