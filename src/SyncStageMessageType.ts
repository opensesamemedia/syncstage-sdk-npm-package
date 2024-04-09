export enum SyncStageMessageType {
  ChangeReceiverVolumeRequest = 'ChangeReceiverVolumeRequest',
  ChangeReceiverVolumeResponse = 'ChangeReceiverVolumeResponse',
  CreateSessionRequest = 'CreateSessionRequest',
  CreateSessionResponse = 'CreateSessionResponse',
  GetReceiverMeasurementsRequest = 'GetReceiverMeasurementsRequest',
  GetReceiverMeasurementsResponse = 'GetReceiverMeasurementsResponse',
  GetReceiverVolumeRequest = 'GetReceiverVolumeRequest',
  GetReceiverVolumeResponse = 'GetReceiverVolumeResponse',
  GetTransmitterMeasurementsRequest = 'GetTransmitterMeasurementsRequest',
  GetTransmitterMeasurementsResponse = 'GetTransmitterMeasurementsResponse',
  IsMicrophoneMutedRequest = 'IsMicrophoneMutedRequest',
  IsMicrophoneMutedResponse = 'IsMicrophoneMutedResponse',
  JoinRequest = 'JoinRequest',
  JoinResponse = 'JoinResponse',
  LeaveRequest = 'LeaveRequest',
  LeaveResponse = 'LeaveResponse',
  Ping = 'Ping',
  Pong = 'Pong',
  ProvisionRequest = 'ProvisionRequest',
  ProvisionResponse = 'ProvisionResponse',
  ReceiverConnectivityChanged = 'ReceiverConnectivityChanged',
  SessionRequest = 'SessionRequest',
  SessionResponse = 'SessionResponse',
  ToggleMicrophoneRequest = 'ToggleMicrophoneRequest',
  ToggleMicrophoneResponse = 'ToggleMicrophoneResponse',
  TransmitterConnectivityChanged = 'TransmitterConnectivityChanged',
  UserJoined = 'UserJoined',
  UserLeft = 'UserLeft',
  UserMuted = 'UserMuted',
  UserUnmuted = 'UserUnmuted',
  SessionOut = 'SessionOut',
  BestAvailableServerRequest = 'BestAvailableServerRequest',
  BestAvailableServerResponse = 'BestAvailableServerResponse',
  ServerInstancesRequest = 'ServerInstancesRequest',
  ServerInstancesResponse = 'ServerInstancesResponse',
  LatencyOptimizationLevelRequest = 'LatencyOptimizationLevelRequest',
  LatencyOptimizationLevelResponse = 'LatencyOptimizationLevelResponse',
  ChangeLatencyOptimizationLevelRequest = 'ChangeLatencyOptimizationLevelRequest',
  ChangeLatencyOptimizationLevelResponse = 'ChangeLatencyOptimizationLevelResponse',
  DiscoveryResult = 'DiscoveryResult',
  DiscoveryLatencyResult = 'DiscoveryLatencyResult',
  StartRecordingRequest = 'StartRecordingRequest',
  StartRecordingResponse = 'StartRecordingResponse',
  RecordingStarted = 'RecordingStarted',
  StopRecordingRequest = 'StopRecordingRequest',
  StopRecordingResponse = 'StopRecordingResponse',
  RecordingStopped = 'RecordingStopped',
  UpdateTokenRequest = 'UpdateTokenRequest',
  UpdateTokenResponse = 'UpdateTokenResponse',
  IsDesktopAgentConnected = 'IsDesktopAgentConnected',
  DesktopAgentConnected = 'DesktopAgentConnected',
  DesktopAgentDisconnected = 'DesktopAgentDisconnected',
  TabClosed = 'TabClosed',
}
