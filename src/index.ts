import SyncStageSDKErrorCode from './SyncStageSDKErrorCode'
import { IZonesInRegionsList } from './models/IZonesIRegionsList';

export default class SyncStage {

  public init(applicationSecretId: string, applicationSecretKey: string): SyncStageSDKErrorCode{
    console.log('init');
    return SyncStageSDKErrorCode.OK;
  }
  
  async function zonesList(): Promise<[ZonesInRegionsList | null, SyncStageSDKErrorCode]> {
  }
  
  async function createSession(zoneId: string, userId: string): Promise<[SessionIdentifier | null, SyncStageSDKErrorCode]> {
  }
  
  async function join(
  sessionCode: string,
  userId: string,
  displayName?: string | null,
  latitude?: number | null,
  longitude?: number | null
  ): Promise<[SessionIdentifier | null, SyncStageSDKErrorCode]> {
  }
  
  async function leave(): : Promise<SessionIdentifier | null, SyncStageSDKErrorCode> {
  }
  
  async function session(): Promise<SyncStageSDKErrorCode<Session | null, SyncStageSDKErrorCode>> {
  }
  
  async function preview(
  sessionCode: string,
  userId: string
  ): Promise<[Session | null, SyncStageSDKErrorCode]> {
  }
  
  function changeReceiverVolume(identifier: string, volume: string): [unknown, unknown] {
  }
  
  function getReceiverVolume(identifier: string): SyncStageSDKErrorCode {
  }
  
  function toggleInternalMic(enable: string): number {
  }
  
  function getInternalMicEnabled(): SyncStageSDKErrorCode {
  }
  
  function toggleDirectMonitor(enable: boolean): boolean {
  }
  
  function getDirectMonitorEnabled(): SyncStageSDKErrorCode {
  }
  
  function getDirectMonitorVolume(): boolean {
  }
  
  function changeDirectMonitorVolume(volume: number): number {
  }
  
  function toggleMicrophone(mute: number): SyncStageSDKErrorCode {
  }
  
  function isMicrophoneMuted(): SyncStageSDKErrorCode {
  }
  
  function getReceiverMeasurements(identifier: string): boolean {
  }
  
  function getTransmitterMeasurements(): Measurements {
  }
}

export { SyncStageSDKErrorCode }
