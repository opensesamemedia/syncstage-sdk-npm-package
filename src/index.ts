import type ISyncStage from './ISyncStage';
import { SyncStageMessageType } from './SyncStageMessageType';
import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import WebSocketClient, { IWebsocketPayload } from './WebSocketClient';
import type ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import type ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IZonesList } from './models/IZonesList';
import { RequestResponseMap } from './RequestResponseMap';
import { MOCK_IS_MICROPHONE_MUTED, MOCK_RECEIVER_MEASUREMENTS, MOCK_RECEIVER_VOLUME, MOCK_SESSION, MOCK_SESSION_IDENTIFIER, MOCK_TRANSMITTER_MEASUREMENTS, MOCK_ZONES_IN_REGION_LIST as MOCK_ZONES_LIST } from './MockData';

const WS_ADDRESS = 'ws://localhost';
const MIN_DRIVER_VERSION = '1.0.0';

export default class SyncStage implements ISyncStage {
  public connectivityDelegate: ISyncStageConnectivityDelegate | null;
  public userDelegate: ISyncStageUserDelegate | null;
  // private ws: WebSocketClient;

  constructor(
    userDelegate: ISyncStageUserDelegate | null,
    connectivityDelegate: ISyncStageConnectivityDelegate | null,
    desktopAgentPort: number = 18080,
  ) {
    this.userDelegate = userDelegate;
    this.connectivityDelegate = connectivityDelegate;
    // this.ws = new WebSocketClient(
    //   `${WS_ADDRESS}:${desktopAgentPort}/browserSdkConnect`, 
    //   (responseType: SyncStageMessageType, content: any) : void => {this.onDelegateMessage(responseType, content)}
    //   );
  }

  private onDelegateMessage(responseType: SyncStageMessageType, content: any): any {
    switch (responseType) {
      case SyncStageMessageType.TransmitterConnectivityChanged: {
        if (this.connectivityDelegate !== null) {
          this.connectivityDelegate.transmitterConnectivityChanged(content.identifier);
        }
        break;
      }
      case SyncStageMessageType.ReceiverConnectivityChanged: {
        if (this.connectivityDelegate !== null) {
          this.connectivityDelegate.receiverConnectivityChanged(content.identifier, content.connected);
        }
        break;
      }
      case SyncStageMessageType.UserJoined: {
        if (this.userDelegate !== null) {
          this.userDelegate.userJoined(content.identifier);
        }
        break;
      }
      case SyncStageMessageType.UserLeft: {
        if (this.userDelegate !== null) {
          this.userDelegate.userLeft(content.identifier);
        }
        break;
      }
      case SyncStageMessageType.UserMuted: {
        if (this.userDelegate !== null) {
          this.userDelegate.userMuted(content.identifier);
        }
        break;
      }
      case SyncStageMessageType.UserUnmuted: {
        if (this.userDelegate !== null) {
          this.userDelegate.userUnmuted(content.identifier);
        }
        break;
      }
      default: {
        console.log(`Unknown delegate message type: ${responseType}`);
        break;
      }
    }
  }

  private responseTypeMatchesRequestType(requestType: SyncStageMessageType, response: IWebsocketPayload): boolean {
    try {
      // @ts-expect-error
      const expectedResponseType = RequestResponseMap[requestType];
      if (expectedResponseType !== response.type) {
        console.log(`Response type ${response.type} does not match expected type ${expectedResponseType}`);
        return false;
      }
    } catch (error) {
      console.log('Uknonwn message type mapping');
      return false;
    }
    return true;
  }

  private parseResponseOnlyErrorCode(
    requestType: SyncStageMessageType,
    response: IWebsocketPayload | null,
  ): SyncStageSDKErrorCode {
    if (response === null) {
      return SyncStageSDKErrorCode.DESKTOP_AGENT_COMMUNICATION_ERROR;
    } else {
      // // TODO: UNCOMMENT WHEN INTEGRATING WITH ACTUAL DESKTOP AGENT
      // if(!this.responseTypeMatchesRequestType(requestType, response)){
      //   return SyncStageSDKErrorCode.UNKNOWN_ERROR
      // }

      return response.errorCode;
    }
  }

  private castAgentResoinseContentToSDKResponseObject(responseType: SyncStageMessageType, content: any): any {
    switch (responseType) {
      case SyncStageMessageType.ZonesListResponse: {
        return content as IZonesList;
      }

      case SyncStageMessageType.CreateSessionResponse: {
        return content as ISessionIdentifier;
      }

      case SyncStageMessageType.GetReceiverVolumeResponse: {
        return content.volume;
      }
      case SyncStageMessageType.IsMicrophoneMutedResponse: {
        return content.mute;
      }
      // IMeasurements response
      case SyncStageMessageType.GetReceiverMeasurementsResponse:
      case SyncStageMessageType.GetTransmitterMeasurementsResponse: {
        return content as IMeasurements;
      }
      // ISession response
      case SyncStageMessageType.JoinResponse: {
      }
      case SyncStageMessageType.SessionResponse: {
        return content as ISession;
      }
      
      // Responses with empty content
      case SyncStageMessageType.LeaveResponse:
      case SyncStageMessageType.Pong:
      case SyncStageMessageType.ProvisionResponse:
      case SyncStageMessageType.ToggleMicrophoneResponse:
      case SyncStageMessageType.ChangeReceiverVolumeResponse: {
        return {};
      }
      default: {
        console.log(`Unknown ${responseType}`);
        break;
      }
    }
  }

  private parseResponseErrorCodeAndContent(
    requestType: SyncStageMessageType,
    response: IWebsocketPayload | null,
  ): [any, SyncStageSDKErrorCode] {
    if (response === null) {
      return [null, SyncStageSDKErrorCode.DESKTOP_AGENT_COMMUNICATION_ERROR];
    } else {
      // // TODO: UNCOMMENT WHEN INTEGRATING WITH ACTUAL DESKTOP AGENT
      // if(!this.responseTypeMatchesRequestType(requestType, response)){
      //   return SyncStageSDKErrorCode.UNKNOWN_ERROR
      // }

      return [this.castAgentResoinseContentToSDKResponseObject(response.type, response.content), response.errorCode];
    }
  }

  async init(applicationSecretId: string, applicationSecretKey: string): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.ProvisionRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, { applicationSecretId, applicationSecretKey, minDriverVersion: MIN_DRIVER_VERSION });
    // return this.parseResponseOnlyErrorCode(requestType, response);
    return SyncStageSDKErrorCode.OK;
  }

  async zonesList(): Promise<[IZonesList | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.ZonesListRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, {});
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_ZONES_LIST, SyncStageSDKErrorCode.OK];
  }

  async createSession(zoneId: string, userId: string): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.CreateSessionRequest;
    console.log(`createSession ${requestType}`);

    // const response = await this.ws.sendMessage(requestType, { zoneId, userId });
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_SESSION_IDENTIFIER, SyncStageSDKErrorCode.OK];
  }

  async join(
    sessionCode: string,
    userId: string,
    displayName?: string | null,
    latitude?: number | null,
    longitude?: number | null,
  ): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.JoinRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, { sessionCode, userId, displayName, latitude, longitude });
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_SESSION, SyncStageSDKErrorCode.OK];
  }

  async leave(): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.LeaveRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, {});
    // return this.parseResponseOnlyErrorCode(requestType, response);
    return SyncStageSDKErrorCode.OK;
  }

  async session(): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.SessionRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, {});
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_SESSION, SyncStageSDKErrorCode.OK];
  }

  async changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.ChangeReceiverVolumeRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, { identifier, volume });
    // return this.parseResponseOnlyErrorCode(requestType, response);
    return SyncStageSDKErrorCode.OK;
  }

  async getReceiverVolume(identifier: string): Promise<[number | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.GetReceiverVolumeRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, { identifier });
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_RECEIVER_VOLUME, SyncStageSDKErrorCode.OK];
  }

  async toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.ToggleMicrophoneRequest;
    console.log(requestType);

    // const response = await this.ws.sendMessage(requestType, { mute });
    // return this.parseResponseOnlyErrorCode(requestType, response);
    return SyncStageSDKErrorCode.OK;
  }

  async isMicrophoneMuted(): Promise<[boolean | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.IsMicrophoneMutedRequest;
    console.log(`session ${requestType}`);

    // const response = await this.ws.sendMessage(requestType, {});
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_IS_MICROPHONE_MUTED, SyncStageSDKErrorCode.OK];
  }

  async getReceiverMeasurements(identifier: string): Promise<[IMeasurements | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.GetReceiverMeasurementsRequest;
    console.log(`session ${requestType}`);

    // const response = await this.ws.sendMessage(requestType, { identifier });
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_RECEIVER_MEASUREMENTS, SyncStageSDKErrorCode.OK];
  }

  async getTransmitterMeasurements(): Promise<[IMeasurements | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.GetTransmitterMeasurementsRequest;
    console.log(`session ${requestType}`);

    // const response = await this.ws.sendMessage(requestType, {});
    // return this.parseResponseErrorCodeAndContent(requestType, response);
    return [MOCK_TRANSMITTER_MEASUREMENTS, SyncStageSDKErrorCode.OK];
  }
}

export {
  ISyncStage,
  SyncStageSDKErrorCode,
  ISyncStageConnectivityDelegate,
  ISyncStageUserDelegate,
  IZonesList,
  ISessionIdentifier,
  ISession,
  IMeasurements,
};
