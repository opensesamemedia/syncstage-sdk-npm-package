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
import { version } from './version';

const BASE_WS_ADDRESS =  'ws://localhost';
const MIN_DRIVER_VERSION = '1.0.1';

export default class SyncStage implements ISyncStage {
  public connectivityDelegate: ISyncStageConnectivityDelegate | null;
  public userDelegate: ISyncStageUserDelegate | null;
  private ws: WebSocketClient;

  constructor(
    userDelegate: ISyncStageUserDelegate | null,
    connectivityDelegate: ISyncStageConnectivityDelegate | null,
    desktopAgentPort: number = 18080,
    base_ws_address: string = BASE_WS_ADDRESS
  ) {
    this.userDelegate = userDelegate;
    this.connectivityDelegate = connectivityDelegate;
    this.ws = new WebSocketClient(
      `${base_ws_address}:${desktopAgentPort}`,
      (responseType: SyncStageMessageType, content: any): void => {
        this.onDelegateMessage(responseType, content);
      },
    );
    console.log("Welcome to SyncStage")
  }

  //#region Private methods
  private onDelegateMessage(responseType: SyncStageMessageType, content: any): any {
    switch (responseType) {
      case SyncStageMessageType.TransmitterConnectivityChanged: {
        if (this.connectivityDelegate !== null) {
          console.log('calling connectivityDelegate.transmitterConnectivityChanged');
          this.connectivityDelegate.transmitterConnectivityChanged(content.identifier);
        } else {
          console.log('connectivityDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.ReceiverConnectivityChanged: {
        if (this.connectivityDelegate !== null) {
          console.log('calling connectivityDelegate.receiverConnectivityChanged');
          this.connectivityDelegate.receiverConnectivityChanged(content.identifier, content.connected);
        } else {
          console.log('connectivityDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.UserJoined: {
        if (this.userDelegate !== null) {
          console.log('calling userDelegate.userJoined');
          this.userDelegate.userJoined(content);
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.UserLeft: {
        if (this.userDelegate !== null) {
          console.log('calling userDelegate.userLeft');
          this.userDelegate.userLeft(content.identifier);
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.UserMuted: {
        if (this.userDelegate !== null) {
          console.log('calling userDelegate.userMuted');
          this.userDelegate.userMuted(content.identifier);
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.UserUnmuted: {
        if (this.userDelegate !== null) {
          console.log('calling userDelegate.userUnmuted');
          this.userDelegate.userUnmuted(content.identifier);
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.SessionOut: {
        if (this.userDelegate !== null) {
          console.log('calling userDelegate.sessionOut');
          this.userDelegate.sessionOut();
        } else {
          console.log('userDelegate is not added');
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
  //#endregion

  async init(applicationSecretId: string, applicationSecretKey: string): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.ProvisionRequest;
    console.log(requestType);

    this.ws.reconnect();

    const response = await this.ws.sendMessage(requestType, {
      applicationSecretId,
      applicationSecretKey,
      minDriverVersion: MIN_DRIVER_VERSION,
    });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  public isDesktopAgentConnected(): boolean{
    return this.ws.isConnected();
  }

  public getSDKVersion(): string{
    return version;
  }

  async zonesList(): Promise<[IZonesList | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.ZonesListRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async createSession(zoneId: string, userId: string): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.CreateSessionRequest;
    console.log(`createSession ${requestType}`);

    const response = await this.ws.sendMessage(requestType, { zoneId, userId });
    return this.parseResponseErrorCodeAndContent(requestType, response);
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

    const response = await this.ws.sendMessage(requestType, { sessionCode, userId, displayName, latitude, longitude });
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async leave(): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.LeaveRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async session(): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.SessionRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.ChangeReceiverVolumeRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, { identifier, volume });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async getReceiverVolume(identifier: string): Promise<[number | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.GetReceiverVolumeRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, { identifier });
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.ToggleMicrophoneRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, { mute });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async isMicrophoneMuted(): Promise<[boolean | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.IsMicrophoneMutedRequest;
    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async getReceiverMeasurements(identifier: string): Promise<[IMeasurements | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.GetReceiverMeasurementsRequest;
    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, { identifier });
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async getTransmitterMeasurements(): Promise<[IMeasurements | null, SyncStageSDKErrorCode]> {
    const requestType = SyncStageMessageType.GetTransmitterMeasurementsRequest;
    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }
}

export {
  ISyncStage,
  SyncStageSDKErrorCode,
  ISyncStageConnectivityDelegate,
  ISyncStageUserDelegate,
  IZonesList as IZonesInRegionsList,
  ISessionIdentifier,
  ISession,
  IMeasurements,
};
