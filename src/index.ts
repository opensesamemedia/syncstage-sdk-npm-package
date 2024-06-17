import { v4 as uuidv4 } from 'uuid';

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
import ISyncStageDesktopAgentDelegate from './delegates/ISyncDesktopAgentDelegate';
import { IZoneLatency } from './models/IZoneLatency';
import { compatibilityMatrix } from './compatibility-matrix';

const originalConsoleLog = console.log;

console.log = function () {
  const args = Array.prototype.slice.call(arguments);
  args.unshift(new Date().toISOString());
  originalConsoleLog.apply(console, args);
};

const COMPATIBILITY_MATRIX_ADDRESS = 'https://public.sync-stage.com/agent/compatibility-matrix.json';
// const BASE_WSS_ADDRESS = 'wss://websocket-pipe.sync-stage.com';
const BASE_WSS_ADDRESS = 'wss://1ag0nfu7b4.execute-api.us-east-1.amazonaws.com/dev';

export default class SyncStage implements ISyncStage {
  public connectivityDelegate: ISyncStageConnectivityDelegate | null;
  public userDelegate: ISyncStageUserDelegate | null;
  public desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null;
  public discoveryDelegate: ISyncStageDiscoveryDelegate | null;
  public onTokenExpired: (() => Promise<string>) | null;
  // eslint-disable-next-line @typescript-eslint/no-empty-function

  private ws: WebSocketClient;
  private isProvisioned = false;
  private jwt: string | null = null;
  private baseWssAddress: string;
  private wsAddressForDesktopAgent = '';
  private wsAddressForSDK = '';
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onDesktopAgentReconnected: () => void = async () => {};
  // eslint-disable-next-line max-len
  private sessionState: ISession | null = null; // the whole state is not updated asynchronously, only receivers list is updated on user join /
  private sessionConnectionState: Map<string, boolean | null> = new Map<string, boolean | null>();
  private syncStageObjectId: string;
  private selectedServer: IServerInstance | null = null;

  constructor(
    userDelegate: ISyncStageUserDelegate | null,
    connectivityDelegate: ISyncStageConnectivityDelegate | null,
    discoveryDelegate: ISyncStageDiscoveryDelegate | null,
    desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null,
    onTokenExpired: (() => Promise<string>) | null,
    baseWsAddress: string = BASE_WSS_ADDRESS,
  ) {
    this.syncStageObjectId = uuidv4();
    this.userDelegate = userDelegate;
    this.connectivityDelegate = connectivityDelegate;
    this.discoveryDelegate = discoveryDelegate;
    this.desktopAgentDelegate = desktopAgentDelegate;
    this.onTokenExpired = onTokenExpired;
    this.baseWssAddress = baseWsAddress;
    this.initUrls();

    console.log(
      // eslint-disable-next-line max-len
      `SDK OBJECT IN CONSTRUCTOR: userDelegate: ${this.userDelegate}, connectivityDelegate: ${this.connectivityDelegate}, discoveryDelegate: ${this.discoveryDelegate} , desktopAgentDelegate: ${this.desktopAgentDelegate}, onTokenExpired: ${this.onTokenExpired}`,
    );
    console.log(this.userDelegate);
    console.log(this.connectivityDelegate);
    console.log(this.discoveryDelegate);
    console.log(this.desktopAgentDelegate);
    console.log(this.onTokenExpired);

    const onDesktopAgentAquiredStatus = (aquired: boolean) => {
      if (aquired) {
        this.desktopAgentDelegate?.desktopAgentAquired();
      } else {
        this.desktopAgentDelegate?.desktopAgentReleased();
      }
    };

    const setAllConnectionsStatusToOffline = () => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      console.log('setAllConnectionsStatusToOffline');
      this.connectivityDelegate?.transmitterConnectivityChanged(false);

      this.sessionState?.receivers.forEach((connection) =>
        this.connectivityDelegate?.receiverConnectivityChanged(connection.identifier, false),
      );
    };

    const setConectionsStatusBackToLastRemembered = () => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      console.log('setConectionsStatusBackToLastRemembered');
      this.connectivityDelegate?.transmitterConnectivityChanged(true);

      this.sessionState?.receivers.forEach((connection) =>
        this.connectivityDelegate?.receiverConnectivityChanged(
          connection.identifier,
          self.sessionConnectionState.get(connection.identifier) ?? false,
        ),
      );
    };

    // Binds to this
    this.onDelegateMessage = this.onDelegateMessage.bind(this);
    this.onProvisionedState = this.onProvisionedState.bind(this);
    this.sendProvision = this.sendProvision.bind(this);

    this.ws = new WebSocketClient(
      this.syncStageObjectId,
      this.onDelegateMessage,
      onDesktopAgentAquiredStatus,
      setAllConnectionsStatusToOffline,
      setConectionsStatusBackToLastRemembered,
      this.onProvisionedState,
      this.desktopAgentDelegate,
    );

    console.log(`Welcome to SyncStage ${this.getSDKVersion()}`);
  }

  // PRIVATE ===========================================================================================================
  private async initUrls() {
    [this.wsAddressForDesktopAgent, this.wsAddressForSDK] = await this.generateWebSocketURLS();
    this.ws.connect(this.wsAddressForSDK);
  }

  private handleServerSelection(selectedServer: any): void {
    console.log('Selected server:', selectedServer);

    this.selectedServer = selectedServer;
    if (this.discoveryDelegate) {
      console.log('calling discoveryDelegate.serverSelected');
      this.discoveryDelegate.serverSelected(selectedServer);
    } else {
      console.log('discoveryDelegate is not added');
    }
  }

  private onProvisionedState = async (isProvisioned: boolean) => {
    if (!isProvisioned && this.isProvisioned) {
      this.desktopAgentDelegate?.onDesktopAgentDeprovisioned();
    }

    this.isProvisioned = isProvisioned;
    if (!this.isProvisioned) {
      const errorCode = await this.sendProvision();
      if (errorCode === SyncStageSDKErrorCode.OK) {
        console.log('Auto-provisioned successfully');
      }
    }

    if (this.isProvisioned) {
      this.desktopAgentDelegate?.onDesktopAgentProvisioned();
    }
  };

  private onDelegateMessage(responseType: SyncStageMessageType, content: any): any {
    switch (responseType) {
      case SyncStageMessageType.TransmitterConnectivityChanged: {
        if (this.connectivityDelegate) {
          console.log('calling connectivityDelegate.transmitterConnectivityChanged');
          this.connectivityDelegate.transmitterConnectivityChanged(content.connected);
        } else {
          console.log('connectivityDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.ReceiverConnectivityChanged: {
        this.sessionConnectionState.set(content.identifier, content.connected);
        if (this.connectivityDelegate) {
          console.log('calling connectivityDelegate.receiverConnectivityChanged');
          this.connectivityDelegate.receiverConnectivityChanged(content.identifier, content.connected);
        } else {
          console.log('connectivityDelegate is not added');
        }

        break;
      }
      case SyncStageMessageType.UserJoined: {
        if (this.userDelegate) {
          console.log('calling userDelegate.userJoined');
          this.sessionConnectionState.set(content.identifier, null);
          this.userDelegate.userJoined(content);
          this.sessionState?.receivers.push(content);
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.UserLeft: {
        if (this.userDelegate) {
          console.log('calling userDelegate.userLeft');
          this.userDelegate.userLeft(content.identifier);

          const indexToRemove = this.sessionState?.receivers.findIndex((receiver) => receiver.identifier === content.identifier) ?? -1;

          if (indexToRemove !== -1) {
            this.sessionState?.receivers.splice(indexToRemove, 1);
          }
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.UserMuted: {
        if (this.userDelegate) {
          console.log('calling userDelegate.userMuted');
          this.userDelegate.userMuted(content.identifier);
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.UserUnmuted: {
        if (this.userDelegate) {
          console.log('calling userDelegate.userUnmuted');
          this.userDelegate.userUnmuted(content.identifier);
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.RecordingStarted: {
        if (this.userDelegate) {
          console.log('calling userDelegate.sessionRecordingStarted');
          this.userDelegate.sessionRecordingStarted();
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }

      case SyncStageMessageType.RecordingStopped: {
        if (this.userDelegate) {
          console.log('calling userDelegate.sessionRecordingStopped');
          this.userDelegate.sessionRecordingStopped();
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }

      case SyncStageMessageType.SessionOut: {
        if (this.userDelegate) {
          console.log('calling userDelegate.sessionOut');
          this.userDelegate.sessionOut();
        } else {
          console.log('userDelegate is not added');
        }
        break;
      }

      case SyncStageMessageType.DiscoveryResult: {
        if (this.discoveryDelegate) {
          console.log('calling discoveryDelegate.discoveryResults');
          console.log('discoveryDelegate delegate visible in sdk:');
          console.log(this.discoveryDelegate);
          this.discoveryDelegate.discoveryResults(content.zones);
        } else {
          console.log('discoveryDelegate is not added');
        }
        break;
      }
      case SyncStageMessageType.DiscoveryLatencyResult: {
        if (this.discoveryDelegate) {
          console.log('calling discoveryDelegate.discoveryResults');
          this.discoveryDelegate.discoveryLatencyTestResults(content.results);
        } else {
          console.log('discoveryDelegate is not added');
        }
        break;
      }

      case SyncStageMessageType.DesktopAgentConnected: {
        console.log('calling desktopAgentDelegate.desktopAgentConnected');
        this.desktopAgentDelegate?.desktopAgentConnected();
        break;
      }

      case SyncStageMessageType.DesktopAgentDisconnected: {
        console.log('calling desktopAgentDelegate.desktopAgentDisconnected');
        this.desktopAgentDelegate?.desktopAgentDisconnected();
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
      return SyncStageSDKErrorCode.TIMEOUT_ERROR;
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
      case SyncStageMessageType.UpdateTokenResponse:
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
      return [null, SyncStageSDKErrorCode.TIMEOUT_ERROR];
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
      let jwtExp;

      try {
        jwtExp = JSON.parse(atob(this.jwt.split('.')[1])).exp * 1000;
      } catch (e) {
        console.log('Invalid JWT provided.');
        return true;
      }

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
      console.log('No JWT provided.');
      return true;
    }
  }
  // #endregion

  private async sendProvision(): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }

    const requestType = SyncStageMessageType.ProvisionRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {
      token: this.jwt,
    });

    const errorCode = this.parseResponseOnlyErrorCode(requestType, response);
    if (errorCode === SyncStageSDKErrorCode.OK) {
      this.isProvisioned = true;
      this.desktopAgentDelegate?.onDesktopAgentProvisioned();
    }
    return errorCode;
  }

  async init(jwt: string): Promise<SyncStageSDKErrorCode> {
    this.jwt = jwt;

    let errorCode;
    if (!this.isProvisioned) {
      errorCode = await this.sendProvision();
    } else {
      errorCode = SyncStageSDKErrorCode.OK;
    }

    if (errorCode === SyncStageSDKErrorCode.OK && !this.selectedServer) {
      const [selectedServer, errorCode] = await this.getBestAvailableServer();
      if (errorCode === SyncStageSDKErrorCode.OK) {
        this.handleServerSelection(selectedServer);
      }
    }

    return errorCode;
  }

  private async sendUpdate(): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }
    const requestType = SyncStageMessageType.UpdateTokenRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {
      token: this.jwt,
    });
    return this.parseResponseOnlyErrorCode(requestType, response);
  }

  private async generateWebSocketURLS(): Promise<string[]> {
    const db = await this.openDB('myDB', 1, (request) => {
      request.result.createObjectStore('myStore');
    });

    let pairingCode = await this.getFromDB(db, 'myStore', 'pairingCode');
    if (!pairingCode) {
      pairingCode = this.generateRandomString(256);
      await this.setInDB(db, 'myStore', 'pairingCode', pairingCode);
    }

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

  //****** IndexedDB helper functions ================================================================================
  private openDB = (name: string, version: number, onUpgradeNeeded: (request: IDBOpenDBRequest) => void) => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => onUpgradeNeeded(request);
    });
  };

  private getFromDB = async (db: IDBDatabase, storeName: string, key: string) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName);
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  private setInDB = async (db: IDBDatabase, storeName: string, key: string, value: any) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  // PUBLIC ============================================================================================================

  async isCompatible(os: string): Promise<boolean> {
    console.log('isCompatible');
    const requestType = SyncStageMessageType.VersionRequest;
    const versionResponse = await this.ws.sendMessage(requestType, { webSDKVersion: version }, 0, 240000);

    if (!versionResponse || versionResponse.errorCode !== SyncStageSDKErrorCode.OK) {
      console.log('Error fetching compatibility matrix');
      return false;
    }

    let matrix;
    try {
      const response = await fetch(COMPATIBILITY_MATRIX_ADDRESS);
      matrix = await response.json();
    } catch (error) {
      console.error(`Failed to fetch compatibility matrix, using fallback. Error: ${error}`);
      matrix = JSON.parse(compatibilityMatrix);
    }

    console.log('Compatibility matrix:', matrix);

    console.log('Current Web SDK version:', version);
    console.log('Current Desktop Agent version:', versionResponse.content.agentVersion);
    console.log('Current OS:', os);
    try {
      const compatibleVersion = matrix.filter((entry: { webSdkVersion: string }) => entry.webSdkVersion === version)[0];

      console.log('compatibleVersion:', compatibleVersion);
      const compatible = compatibleVersion.compatibleDesktopAgentVersions[os].includes(versionResponse.content.agentVersion);
      console.log('Compatible:', compatible);
      return compatible;
    } catch (error) {
      console.error(`Error in isCompatible: ${error}`);
      console.log('No compatible versions found');

      return false;
    }
  }

  async getLatestCompatibleDesktopAgentVersion(os: string): Promise<string | null> {
    console.log('getLatestCompatibleDesktopAgentVersion');
    const requestType = SyncStageMessageType.VersionRequest;
    const versionResponse = await this.ws.sendMessage(requestType, { webSDKVersion: version }, 0, 240000);

    if (!versionResponse || versionResponse.errorCode !== SyncStageSDKErrorCode.OK) {
      console.log('Error fetching compatibility matrix');
      return null;
    }

    let matrix;
    try {
      const response = await fetch(COMPATIBILITY_MATRIX_ADDRESS);
      matrix = await response.json();
    } catch (error) {
      console.error(`Failed to fetch compatibility matrix, using fallback. Error: ${error}`);
      matrix = JSON.parse(compatibilityMatrix);
    }

    console.log('Compatibility matrix:', matrix);

    console.log('Current Web SDK version:', version);
    console.log('Current Desktop Agent version:', versionResponse.content.agentVersion);
    console.log('Current OS:', os);

    try {
      const compatibleVersion = matrix.filter((entry: { webSdkVersion: string }) => entry.webSdkVersion === version)[0];

      console.log('compatibleVersion:', compatibleVersion);

      return compatibleVersion.compatibleDesktopAgentVersions[os].slice(-1)[0];
    } catch (error) {
      console.error(`Error in getLatestCompatibleDesktopAgentVersion: ${error}`);
      return null;
    }
  }

  async updateToken(jwt: string): Promise<SyncStageSDKErrorCode> {
    this.jwt = jwt;
    return await this.sendUpdate();
  }

  isDesktopAgentConnected(): boolean {
    return this.ws.desktopAgentConnected();
  }

  getSDKVersion(): string {
    return version;
  }

  updateOnDesktopAgentReconnected(onDesktopAgentReconnected: () => void): void {
    this.onDesktopAgentReconnected = onDesktopAgentReconnected;
    this.onDesktopAgentReconnected = this.onDesktopAgentReconnected.bind(this);
    this.ws.updateOnWebsocketReconnected(this.onDesktopAgentReconnected);
  }

  // Deprecated
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

  async getSelectedServer(): Promise<[IServerInstance | null, SyncStageSDKErrorCode]> {
    return [this.selectedServer, SyncStageSDKErrorCode.OK];
  }

  async setSelectedServer(selectedServer: IServerInstance): Promise<SyncStageSDKErrorCode> {
    this.handleServerSelection(selectedServer);

    return SyncStageSDKErrorCode.OK;
  }

  async createSession(
    userId: string,
    zoneId?: string | null,
    studioServerId?: string | null,
  ): Promise<[ISessionIdentifier | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.CreateSessionRequest;
    console.log(`createSession ${requestType}`);

    let response;
    if (zoneId && studioServerId) {
      response = await this.ws.sendMessage(requestType, { zoneId, studioServerId, userId });
    } else {
      if (!this.selectedServer) {
        const [selectedServer, errorCode] = await this.getBestAvailableServer();
        if (errorCode === SyncStageSDKErrorCode.OK) {
          this.handleServerSelection(selectedServer);
        } else {
          return [null, SyncStageSDKErrorCode.NO_STUDIO_SERVER_AVAILABLE];
        }
      }
      console.log(`Creating session with auto selected server: ${JSON.stringify(this.selectedServer)}`);
      response = await this.ws.sendMessage(requestType, {
        zoneId: this.selectedServer?.zoneId,
        studioServerId: this.selectedServer?.studioServerId,
        userId,
      });
    }

    return this.parseResponseErrorCodeAndContent(requestType, response);
  }

  async join(
    sessionCode: string,
    userId: string,
    displayName?: string | null,
    zoneId?: string | null,
    studioServerId?: string | null,
  ): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.JoinRequest;
    console.log(requestType);

    let response;

    if (zoneId && studioServerId) {
      console.log(`Joining with zoneId: ${zoneId} and studioServerId: ${studioServerId}`);
      response = await this.ws.sendMessage(requestType, {
        sessionCode,
        userId,
        zoneId,
        studioServerId,
        displayName,
      });
    } else {
      if (!this.selectedServer) {
        const [selectedServer, errorCode] = await this.getBestAvailableServer();
        if (errorCode === SyncStageSDKErrorCode.OK) {
          this.handleServerSelection(selectedServer);
        } else {
          return [null, SyncStageSDKErrorCode.NO_STUDIO_SERVER_AVAILABLE];
        }
      }
      console.log(`Joining with auto selected server: ${JSON.stringify(this.selectedServer)}`);
      response = await this.ws.sendMessage(requestType, {
        sessionCode,
        userId,
        zoneId: this.selectedServer?.zoneId,
        studioServerId: this.selectedServer?.studioServerId,
        displayName,
      });
    }
    const [sessionState, errorCode] = this.parseResponseErrorCodeAndContent(requestType, response);
    this.sessionState = sessionState;
    return [sessionState, errorCode];
  }

  async leave(): Promise<SyncStageSDKErrorCode> {
    if (await this.isJwtExpired()) {
      return SyncStageSDKErrorCode.TOKEN_EXPIRED;
    }

    const requestType = SyncStageMessageType.LeaveRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    const errorCode = this.parseResponseOnlyErrorCode(requestType, response);

    if (errorCode === SyncStageSDKErrorCode.OK) {
      this.sessionState = null;
    }
    return errorCode;
  }

  async session(): Promise<[ISession | null, SyncStageSDKErrorCode]> {
    if (await this.isJwtExpired()) {
      return [null, SyncStageSDKErrorCode.TOKEN_EXPIRED];
    }

    const requestType = SyncStageMessageType.SessionRequest;
    console.log(requestType);

    const response = await this.ws.sendMessage(requestType, {});
    const [sessionState, errorCode] = this.parseResponseErrorCodeAndContent(requestType, response);
    this.sessionState = sessionState;
    return [sessionState, errorCode];
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

  async getLatencyOptimizationLevel(): Promise<[ILatencyOptimizationLevel | null, SyncStageSDKErrorCode]> {
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
  declare indexedDB: any; // Add this line to declare the indexedDB object

  async getDesktopAgentProtocolHandler(): Promise<string> {
    while (this.wsAddressForDesktopAgent === '') {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const encodedWssAddress = encodeURIComponent(this.wsAddressForDesktopAgent);
    return `syncstageagent://${encodedWssAddress}`;
  }

  async checkProvisionedStatus(): Promise<boolean> {
    console.log(`SDK index checkProvisionedStatus ${this.isProvisioned}`);
    console.log(`checkProvisionedStatus 'this' is an instance of: ${this.constructor.name}`);

    return this.isProvisioned;
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
