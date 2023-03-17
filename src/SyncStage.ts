import type ISyncStage from './ISyncStage';
import {
  MOCK_INTERNAL_MIC_ENABLED,
  MOCK_DM_VOLUME,
  MOCK_RECEIVER_VOLUME,
  MOCK_DIRECT_MONITOR_ENABLED,
  MOCK_IS_MICROPHONE_MUTED,
  MOCK_RECEIVER_MEASUREMENTS,
  MOCK_TRANSMITTER_MEASUREMENTS,
  MOCK_ZONES_IN_REGION_LIST,
  MOCK_SESSION_IDENTIFIER,
  MOCK_SESSION,
} from './MockData';
import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IZonesInRegionsList } from './models/IZonesIRegionsList';

export default class SyncStage implements ISyncStage {
  public connectivityDelegate: ISyncStageConnectivityDelegate | null;
  public userDelegate: ISyncStageUserDelegate | null;
  
  constructor(
    userDelegate: ISyncStageUserDelegate | null,
    connectivityDelegate: ISyncStageConnectivityDelegate | null,
  ) {
    this.userDelegate = userDelegate;
    this.connectivityDelegate = connectivityDelegate;
  }
  
  async init(applicationSecretId: string, applicationSecretKey: string): Promise<SyncStageSDKErrorCode> {
    console.log('init');
    return SyncStageSDKErrorCode.OK;
  }

  async zonesList(): Promise<[IZonesInRegionsList | null, SyncStageSDKErrorCode]> {
    return [MOCK_ZONES_IN_REGION_LIST, SyncStageSDKErrorCode.OK];
  }

  async createSession(zoneId: string, userId: string): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]> {
    return [MOCK_SESSION_IDENTIFIER, SyncStageSDKErrorCode.OK];
  }

  async join(
    sessionCode: string,
    userId: string,
    displayName?: string | null,
    latitude?: number | null,
    longitude?: number | null,
  ): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    return [MOCK_SESSION, SyncStageSDKErrorCode.OK];
  }

  async leave(): Promise<SyncStageSDKErrorCode> {
    return SyncStageSDKErrorCode.OK;
  }

  async session(): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    return [MOCK_SESSION, SyncStageSDKErrorCode.OK];
  }

  async preview(sessionCode: string, userId: string): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    return [MOCK_SESSION, SyncStageSDKErrorCode.OK];
  }

  async changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode> {
    return SyncStageSDKErrorCode.OK;
  }

  async getReceiverVolume(identifier: string): Promise<number> {
    return MOCK_RECEIVER_VOLUME;
  }

  async toggleInternalMic(enable: boolean): Promise<SyncStageSDKErrorCode> {
    return SyncStageSDKErrorCode.OK;
  }

  async getInternalMicEnabled(): Promise<boolean> {
    return MOCK_INTERNAL_MIC_ENABLED;
  }

  async toggleDirectMonitor(enable: boolean): Promise<SyncStageSDKErrorCode> {
    return SyncStageSDKErrorCode.OK;
  }

  async getDirectMonitorEnabled(): Promise<boolean> {
    return MOCK_DIRECT_MONITOR_ENABLED;
  }

  async getDirectMonitorVolume(): Promise<number> {
    return MOCK_DM_VOLUME;
  }

  async changeDirectMonitorVolume(volume: number): Promise<SyncStageSDKErrorCode> {
    return SyncStageSDKErrorCode.OK;
  }

  async toggleMicrophone(mute: number): Promise<SyncStageSDKErrorCode> {
    return SyncStageSDKErrorCode.OK;
  }

  async isMicrophoneMuted(): Promise<boolean> {
    return MOCK_IS_MICROPHONE_MUTED;
  }

  async getReceiverMeasurements(identifier: string): Promise<IMeasurements> {
    return MOCK_RECEIVER_MEASUREMENTS;
  }

  async getTransmitterMeasurements(): Promise<IMeasurements> {
    return MOCK_TRANSMITTER_MEASUREMENTS;
  }
}

export { SyncStageSDKErrorCode };
