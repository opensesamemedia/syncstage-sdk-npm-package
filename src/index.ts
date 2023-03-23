import type ISyncStage from './ISyncStage';
import {
  MOCK_RECEIVER_VOLUME,
  MOCK_IS_MICROPHONE_MUTED,
  MOCK_RECEIVER_MEASUREMENTS,
  MOCK_TRANSMITTER_MEASUREMENTS,
  MOCK_ZONES_IN_REGION_LIST,
  MOCK_SESSION_IDENTIFIER,
  MOCK_SESSION,
} from './MockData';
import { SyncStageMessageType } from './SyncStageMessageType';
import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import WebSocketClient from './WebSocketClient';
import type ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import type ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IZonesInRegionsList } from './models/IZonesIRegionsList';


export default class SyncStage implements ISyncStage {
  public connectivityDelegate: ISyncStageConnectivityDelegate | null;
  public userDelegate: ISyncStageUserDelegate | null;
  private ws: WebSocketClient;

  constructor(
    userDelegate: ISyncStageUserDelegate | null,
    connectivityDelegate: ISyncStageConnectivityDelegate | null,
  ) {
    this.userDelegate = userDelegate;
    this.connectivityDelegate = connectivityDelegate;
    this.ws = new WebSocketClient("ws://localhost:18080");
  }

  async init(applicationSecretId: string, applicationSecretKey: string): Promise<SyncStageSDKErrorCode> {
    console.log('init');
    await this.ws.sendMessage(SyncStageMessageType.ProvisionRequest, {applicationSecretId, applicationSecretKey})
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

  async toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode> {
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

export {
  ISyncStage,
  SyncStageSDKErrorCode,
  ISyncStageConnectivityDelegate,
  ISyncStageUserDelegate,
  IZonesInRegionsList,
  ISessionIdentifier,
  ISession,
  IMeasurements,
};
