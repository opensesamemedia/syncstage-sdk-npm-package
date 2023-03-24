import { SyncStageMessageType } from './SyncStageMessageType';

export enum RequestResponseMap {
  Ping = SyncStageMessageType.Pong,
  ProvisionRequest = SyncStageMessageType.ProvisionResponse,
  ZonesListRequest = SyncStageMessageType.ZonesListResponse,
  CreateSessionRequest = SyncStageMessageType.CreateSessionResponse,
  JoinRequest = SyncStageMessageType.JoinResponse,
  LeaveRequest = SyncStageMessageType.LeaveResponse,
  SessionRequest = SyncStageMessageType.SessionResponse,
  ChangeReceiverVolumeRequest = SyncStageMessageType.ChangeReceiverVolumeResponse,
  GetReceiverVolumeRequest = SyncStageMessageType.GetReceiverVolumeResponse,
  ToggleMicrophoneRequest = SyncStageMessageType.ToggleMicrophoneResponse,
  IsMicrophoneMutedRequest = SyncStageMessageType.IsMicrophoneMutedResponse,
  GetReceiverMeasurementsRequest = SyncStageMessageType.GetReceiverMeasurementsResponse,
  GetTransmitterMeasurementsRequest = SyncStageMessageType.GetTransmitterMeasurementsResponse,
}
