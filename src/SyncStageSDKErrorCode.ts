enum SyncStageSDKErrorCode {
    'UNKNOWN_ERROR'=-1, 
    'OK'=0,
    'CONFIGURATION_ERROR'=1,
    'API_ERROR'=2,
    'API_UNAUTHORIZED'=3,
    'AUDIO_STREAMING_ERROR'=4,
    'STREAM_DOES_NOT_EXIST'=5, 
    'BAD_VOLUME_VALUE'=6,
    'SESSION_NOT_JOINED'=7,
    'AUDIO_SERVER_NOT_REACHABLE'=8,
}

export default SyncStageSDKErrorCode;