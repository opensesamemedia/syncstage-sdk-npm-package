import type ISyncStage from './ISyncStage';
import { SyncStageMessageType } from './SyncStageMessageType';
import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';
import WebSocketClient, { IWebsocketPayload } from './WebSocketClient';
import type ISyncStageConnectivityDelegate from './delegates/ISyncStageConnectivityDelegate';
import type ISyncStageUserDelegate from './delegates/ISyncStageUserDelegate';
import type { IMeasurements } from './models/IMeasurements';
import type { ISession, ISessionIdentifier } from './models/ISession';
import type { IServerInstance, IServerInstances } from './models/IServerInstances';
import { RequestResponseMap } from './RequestResponseMap';
import { version } from './version';
import ISyncStageDiscoveryDelegate from './delegates/ISyncStageDiscoveryDelegate';
import { ILatencyOptimizationLevel } from './models/ILatencyOptimizationLevel';
import { IZoneLatency } from './models/IZoneLatency';
import ISyncStageDesktopAgentDelegate from './delegates/ISyncDesktopAgentDelegate';

// const BASE_WSS_ADDRESS = 'wss://websocket-pipe.sync-stage.com';
const BASE_WSS_ADDRESS = 'wss://1ag0nfu7b4.execute-api.us-east-1.amazonaws.com/dev';
const MIN_DRIVER_VERSION = '1.0.1';

export default class SyncStage implements ISyncStage {
  public connectivityDelegate: ISyncStageConnectivityDelegate | null;
  public userDelegate: ISyncStageUserDelegate | null;
  public discoveryDelegate: ISyncStageDiscoveryDelegate | null;
  public desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null;
  public onTokenExpired: (() => Promise<string>) | null;
  // eslint-disable-next-line @typescript-eslint/no-empty-function

  private ws: WebSocketClient;
  private jwt: string | null = null;
  private baseWssAddress: string;
  private wsAddressForDesktopAgent: string;
  private wsAddressForSDK: string;
  private onWebsocketReconnected: () => void = () => {};

  constructor(
    userDelegate: ISyncStageUserDelegate | null,
    connectivityDelegate: ISyncStageConnectivityDelegate | null,
    discoveryDelegate: ISyncStageDiscoveryDelegate | null,
    desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null,
    onTokenExpired: (() => Promise<string>) | null,
    baseWsAddress: string = BASE_WSS_ADDRESS,
  ) {
    this.userDelegate = userDelegate;
    this.connectivityDelegate = connectivityDelegate;
    this.discoveryDelegate = discoveryDelegate;
    this.desktopAgentDelegate = desktopAgentDelegate;
    this.onTokenExpired = onTokenExpired;
    this.baseWssAddress = baseWsAddress;
    [this.wsAddressForDesktopAgent, this.wsAddressForSDK] = this.generateWebSocketURLS();

    const onDelegateMessage = (responseType: SyncStageMessageType, content: any): void => {
      this.onDelegateMessage(responseType, content);
    };

    const onDesktopAgentAquiredStatus = (aquired: boolean) => {
      if (aquired) {
        this.desktopAgentDelegate?.desktopAgentAquired();
      } else {
        this.desktopAgentDelegate?.desktopAgentReleased();
      }
    };

    this.ws = new WebSocketClient(this.wsAddressForSDK, onDelegateMessage, this.onWebsocketReconnected, onDesktopAgentAquiredStatus);
    console.log('Welcome to SyncStage');
  }

  public updateOnWebsocketReconnected(onWebsocketReconnected: () => void): void {
    this.onWebsocketReconnected = onWebsocketReconnected;
    this.ws.updateOnWebsocketReconnected(this.onWebsocketReconnected);
  }

  // #region Private methods
  private onDelegateMessage(responseType: SyncStageMessageType, content: any): any {
    switch (responseType) {
      case SyncStageMessageType.TransmitterConnectivityChanged: {
        if (this.connectivityDelegate !== null) {
          console.log('calling connectivityDelegate.transmitterConnectivityChanged');
          this.connectivityDelegate.transmitterConnectivityChanged(content.connected);
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
      case SyncStageMessageType.RecordingStarted: {
        if (this.userDelegate !== null) {
          console.log('calling userDelegate.sessionRecordingStarted');
          this.userDelegate.sessionRecordingStarted();
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }

      case SyncStageMessageType.RecordingStopped: {
        if (this.userDelegate !== null) {
          console.log('calling userDelegate.sessionRecordingStopped');
          this.userDelegate.sessionRecordingStopped();
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

      case SyncStageMessageType.DiscoveryResult: {
        if (this.discoveryDelegate !== null) {
          console.log('calling discoveryDelegate.discoveryResults');
          this.discoveryDelegate.discoveryResults(content.zones);
        } else {
          console.log('discoveryDelegate is not added');
        }
        break;
      }

      case SyncStageMessageType.DesktopAgentConnected: {
        if (this.desktopAgentDelegate !== null) {
          console.log('calling desktopAgentDelegate.desktopAgentConnected');
          this.desktopAgentDelegate?.desktopAgentConnected();
        } else {
          console.log('desktopAgentDelegate is not added');
        }
        break;
      }

      case SyncStageMessageType.DesktopAgentDisconnected: {
        if (this.desktopAgentDelegate !== null) {
          console.log('calling desktopAgentDelegate.desktopAgentDisconnected');
          this.desktopAgentDelegate?.desktopAgentDisconnected();
        } else {
          console.log('desktopAgentDelegate is not added');
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

  private parseResponseOnlyErrorCode(requestType: SyncStageMessageType, response: IWebsocketPayload | null): SyncStageSDKErrorCode {
    if (response === null) {
      return SyncStageSDKErrorCode.DESKTOP_AGENT_COMMUNICATION_ERROR;
    }
    if (!this.responseTypeMatchesRequestType(requestType, response)) {
      return SyncStageSDKErrorCode.UNKNOWN_ERROR;
    }

    return response.errorCode;
  }

  private castAgentResponseContentToSDKResponseObject(responseType: SyncStageMessageType, content: any): any {
    switch (responseType) {
      case SyncStageMessageType.BestAvailableServerRequest: {
        return content as IServerInstance;
      }

      case SyncStageMessageType.ServerInstancesRequest: {
        return content as IServerInstances;
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

      case SyncStageMessageType.LatencyOptimizationLevelResponse: {
        return content as ILatencyOptimizationLevel;
      }

      case SyncStageMessageType.BestAvailableServerResponse: {
        return content as IServerInstance;
      }

      case SyncStageMessageType.ServerInstancesResponse: {
        return content as IServerInstances;
      }
      // IMeasurements response
      case SyncStageMessageType.GetReceiverMeasurementsResponse:
      case SyncStageMessageType.GetTransmitterMeasurementsResponse: {
        return content as IMeasurements;
      }
      // ISession response
      case SyncStageMessageType.JoinResponse:
      case SyncStageMessageType.SessionResponse: {
        return content as ISession;
      }

      // Responses with empty content
      case SyncStageMessageType.Pong:
      case SyncStageMessageType.LeaveResponse:
      case SyncStageMessageType.ChangeLatencyOptimizationLevelResponse:
      case SyncStageMessageType.ProvisionResponse:
      case SyncStageMessageType.ToggleMicrophoneResponse:
      case SyncStageMessageType.ChangeReceiverVolumeResponse:
      case SyncStageMessageType.StartRecordingResponse:
      case SyncStageMessageType.StopRecordingResponse: {
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
    }
    if (!this.responseTypeMatchesRequestType(requestType, response)) {
      return [null, SyncStageSDKErrorCode.UNKNOWN_ERROR];
    }

    return [this.castAgentResponseContentToSDKResponseObject(response.type, response.content), response.errorCode];
  }
  private async isJwtExpired() {
    if (this.jwt != null) {
      // check if token will be valid for at least the next 10 seconds
      const dateIn10sec = Date.now() + 10 * 1000;
      const jwtExp = JSON.parse(atob(this.jwt.split('.')[1])).exp * 1000;

      const expired = dateIn10sec >= jwtExp;

      if (expired && this.onTokenExpired != null) {
        const newToken = await this.onTokenExpired();
        if (newToken != null && newToken.length > 5) {
          await this.updateToken(newToken);
          console.log('New jwt updated.');
          return false;
        }
      } else if (expired) {
        console.log('Jwt expired.');
      }
      return expired;
    } else {
      console.log('No JWT provided, treating as expired.');
      return true;
    }
  }
  // #endregion

  async init(jwt: string): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.ProvisionRequest;
    console.log(requestType);
    this.jwt = jwt;
    const response = await this.ws.sendMessage(requestType, {
      token: jwt,
    });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async updateToken(jwt: string): Promise<SyncStageSDKErrorCode> {
    const requestType = SyncStageMessageType.UpdateTokenRequest;
    console.log(requestType);
    this.jwt = jwt;
    const response = await this.ws.sendMessage(requestType, {
      token: jwt,
    });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  public isDesktopAgentConnected(): boolean {
    return this.ws.desktopAgentConnected();
  }

  public getSDKVersion(): string {
    return version;
  }

  async getBestAvailableServer(): Promise<[IServerInstance | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.BestAvailableServerRequest;
    console.log(requestType);

    // This procedure takes a lot of time to measure latency for numerous servers, that is why timeout is 240s
    const response = await this.ws.sendMessage(requestType, {}, 0, 240000);
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async getServerInstances(): Promise<[IServerInstances | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.ServerInstancesRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async createSession(zoneId: string, studioServerId: string, userId: string): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.CreateSessionRequest;
    console.log(`createSession ${requestType}`);

    const response = await this.ws.sendMessage(requestType, { zoneId, studioServerId, userId });
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async join(
    sessionCode: string,
    userId: string,
    zoneId: string,
    studioServerId: string,
    displayName?: string | null,
  ): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.JoinRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {
      sessionCode,
      userId,
      zoneId,
      studioServerId,
      displayName,
    });
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async leave(): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }

    const requestType = SyncStageMessageType.LeaveRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async session(): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.SessionRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async changeReceiverVolume(identifier: string, volume: number): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }

    const requestType = SyncStageMessageType.ChangeReceiverVolumeRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, { identifier, volume });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async getReceiverVolume(identifier: string): Promise<[number | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }
    const requestType = SyncStageMessageType.GetReceiverVolumeRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, { identifier });
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async toggleMicrophone(mute: boolean): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }
    const requestType = SyncStageMessageType.ToggleMicrophoneRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, { mute });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async isMicrophoneMuted(): Promise<[boolean | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }
    const requestType = SyncStageMessageType.IsMicrophoneMutedRequest;
    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async getReceiverMeasurements(identifier: string): Promise<[IMeasurements | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }
    const requestType = SyncStageMessageType.GetReceiverMeasurementsRequest;
    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, { identifier });
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async getTransmitterMeasurements(): Promise<[IMeasurements | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }
    const requestType = SyncStageMessageType.GetTransmitterMeasurementsRequest;
    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async getLatencyOptimizationLevel(): Promise<[IZoneLatency | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }
    const requestType = SyncStageMessageType.LatencyOptimizationLevelRequest;

    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async changeLatencyOptimizationLevel(level: number): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }
    const requestType = SyncStageMessageType.ChangeLatencyOptimizationLevelRequest;

    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, { level });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async startRecording(): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }
    const requestType = SyncStageMessageType.StartRecordingRequest;

    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  async stopRecording(): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }
    const requestType = SyncStageMessageType.StopRecordingRequest;

    console.log(`session ${requestType}`);

    const response = await this.ws.sendMessage(requestType, {});
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  public getDesktopAgentProtocolHandler(): string {
    const encodedWssAddress = encodeURIComponent(this.wsAddressForDesktopAgent);
    return `syncstageagent://${encodedWssAddress}`;
  }

  private generateWebSocketURLS(): string[] {
    const pairingCode = localStorage.getItem('pairingCode') || this.generateRandomString(256);
    localStorage.setItem('pairingCode', pairingCode);

    return [
      `${this.baseWssAddress}?peerType=DESKTOP_AGENT&pairingCode=${pairingCode}`,
      `${this.baseWssAddress}?peerType=BROWSER_SDK&pairingCode=${pairingCode}`,
    ];
  }

  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }
}

export {
  ISyncStage,
  SyncStageSDKErrorCode,
  ISyncStageConnectivityDelegate,
  ISyncStageUserDelegate,
  ISyncStageDiscoveryDelegate,
  ISyncStageDesktopAgentDelegate,
  IServerInstances,
  IServerInstance,
  ISessionIdentifier,
  ISession,
  IMeasurements,
  IZoneLatency,
  ILatencyOptimizationLevel,
};
