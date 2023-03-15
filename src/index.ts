import SyncStageSDKErrorCode from "./SyncStageSDErrorCode";

export default class SyncStage {

  public init(applicationSecretId: String, applicationSecretKey: String): SyncStageSDKErrorCode{
    console.log("init");
    return SyncStageSDKErrorCode.OK;
  } 
}

export { SyncStageSDKErrorCode };
