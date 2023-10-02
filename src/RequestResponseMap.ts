import { SyncStageMessageType } from './SyncStageMessageType';

export enum RequestResponseMap {
  Ping = SyncStageMessageType.Pong,
  ProvisionRequest = SyncStageMessageType.ProvisionResponse,
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
  BestAvailableServerRequest = SyncStageMessageType.BestAvailableServerResponse,
  ServerInstancesRequest = SyncStageMessageType.ServerInstancesResponse,
  LatencyOptimizationLevelRequest = SyncStageMessageType.LatencyOptimizationLevelResponse,
  ChangeLatencyOptimizationLevelRequest = SyncStageMessageType.ChangeLatencyOptimizationLevelResponse,
  AssignWebsocketId = SyncStageMessageType.WebsocketAssigned,
  StartRecordingRequest = SyncStageMessageType.StartRecordingResponse,
  StopRecordingRequest = SyncStageMessageType.StopRecordingResponse,
  UpdateTokenRequest = SyncStageMessageType.UpdateTokenResponse,
}
