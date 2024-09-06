/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';
import isOnline from 'is-online';
import Sarus from '@anephenix/sarus';

import { SyncStageMessageType } from './SyncStageMessageType';
import ISyncStageDesktopAgentDelegate from './delegates/ISyncDesktopAgentDelegate';

const WAIT_FOR_RESPONSE_TIMEOUT_MS = 35000;
const AGENT_PING_INTERVAL_MS = 5000;
const SERVER_PING_INTERVAL_MS = 2000;
const ISONLINE_INTERVAL_MS = 5000;
const ALLOWED_TIME_WITHOUT_AGENT_PONG_MS = 11000;
const ALLOWED_TIME_WITHOUT_SERVER_PONG_MS = 5000;
const ERROR_CONNECTIONS_BEFORE_AQUIRED = 6;

export interface IWebsocketPayload {
  type: SyncStageMessageType;
  msgId: string;
  time: string;
  errorCode: number;
  content: any;
}

interface IPendingRequest {
  resolve: (value: any) => void;
  timeout: number;
}

export default class {
  private syncStageObjectId: string;
  private url = '';
  private sarus: Sarus | null = null;
  private requests: Map<string, IPendingRequest>;
  private onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void;
  private onDesktopAgentAquiredStatus: (aquired: boolean) => void;
  private onOnline: () => void;
  private onOffline: () => void;
  private onProvisionedState: (state: boolean) => void;
  private isWebsocketConnectionLive = false;
  private isDesktopAgentConnected = false;
  private pingInterval: any = null;
  private serverPingInterval: any = null;
  private agentPingCheckInterval: any = null;
  private checkDesktopAgentInterval: any = null;
  private isOnlineInterval: any = null;
  private wasSleepingInterval: any = null;
  private reconnectWatchdogInterval: any = null;
  private lastTimeActive = Date.now();
  private desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null;
  private reconnectingTimestamp: number | null = null;
  private lastAgentPongReceivedDate: number | null = null;
  private lastServerPongReceivedDate: number | null = null;
  private lastConnectedDate: number | null = null;
  private connectionErrorCount = 0;

  private online: boolean | null = null;
  private reconnecting = false;
  private visibilityChangeTimestamp: number | null = null;

  private onDesktopAgentReconnected: (() => void) | null = null;

  constructor(
    syncStageObjectId: string,
    onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void,
    onDesktopAgentAquiredStatus: (aquired: boolean) => void,
    onOffline: () => void,
    onOnline: () => void,
    onProvisionState: (provisioned: boolean) => void,
    desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null = null,
  ) {
    this.syncStageObjectId = syncStageObjectId;
    this.onDelegateMessage = onDelegateMessage;
    this.onProvisionedState = onProvisionState;
    this.requests = new Map();
    this.onDesktopAgentAquiredStatus = onDesktopAgentAquiredStatus;
    this.onOnline = onOnline;
    this.onOffline = onOffline;
    this.desktopAgentDelegate = desktopAgentDelegate;

    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);
    this.onDesktopAgentAquiredStatus = this.onDesktopAgentAquiredStatus.bind(this);

    this.isOnlineInterval = setInterval(async () => {
      const online = await isOnline();
      if (this.online !== online) {
        this.online = online;
        console.log(`Network status changed to online: ${online}`);
        if (online) {
          await this.onOnline();
        } else {
          await this.onOffline();
        }
      }
    }, ISONLINE_INTERVAL_MS);

    this.wasSleepingInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.lastTimeActive;

      if (elapsedTime > 2 * 5000) {
        // 5 seconds
        console.log('The computer was likely in sleep mode or shutdown, restart the WebSocket connection.');

        if (!this.reconnecting) {
          this.reconnect();
        }
      }

      this.lastTimeActive = currentTime;
    }, 5000);

    this.reconnectWatchdogInterval = setInterval(() => {
      if (this.reconnecting && this.reconnectingTimestamp !== null) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.reconnectingTimestamp;
        if (elapsedTime > 8000) {
          // 5 seconds
          console.log('Re connecting for more than 8 seconds, rerun sarus.reconnect().');
          this.reconnect();
        }
      }
    }, 1000); // check every second
  }

  connect(url: string) {
    this.url = url;

    this.sarus = new Sarus({
      url: this.createWebsocketURI(),
      eventListeners: {
        open: [this.onOpen],
        message: [this.onMessage],
        close: [this.onClose],
        error: [this.onError],
      },
      reconnectAutomatically: true,
      retryConnectionDelay: 2500,
      storageType: 'memory',
    });
  }

  private reconnect() {
    console.log('Reconnecting WebSocket to server');
    if (this.sarus) {
      this.sarus.messages = [];
    }
    this.reconnecting = true;
    this.reconnectingTimestamp = Date.now();
    this.sarus?.reconnect();
  }

  public updateOnDesktopAgentReconnected(onDesktopAgentReconnected: (() => void) | null) {
    this.onDesktopAgentReconnected = onDesktopAgentReconnected;
  }

  private createWebsocketURI(): string {
    return `${this.url}&syncStageObjectId=${this.syncStageObjectId}&websocketId=${uuidv4()}`;
  }

  private async handleDesktopAgentDisconnected() {
    console.log('calling desktopAgentDelegate.handleDesktopAgentDisconnected in handleDesktopAgentDisconnected');
    this.desktopAgentDelegate?.desktopAgentDisconnected();
  }

  private async handleBrowserDisconnected() {
    console.log('calling desktopAgentDelegate.handleBrowserDisconnected in handleBrowserDisconnected');
    this.desktopAgentDelegate?.browserDisconnected();
    this.reconnect();
  }

  private async onOpen() {
    if (this.sarus) {
      this.sarus.messages = [];
    }
    this.reconnecting = false;
    this.reconnectingTimestamp = null;
    this.connectionErrorCount = 0;
    console.log(`Connected WebSocket to server`);

    this.onDesktopAgentAquiredStatus(false);

    this.lastAgentPongReceivedDate = null;
    this.lastConnectedDate = Date.now();

    if (!this.pingInterval) {
      await this.sendMessage(SyncStageMessageType.Ping, {});

      this.pingInterval = setInterval(async () => {
        await this.sendMessage(SyncStageMessageType.Ping, {});
      }, AGENT_PING_INTERVAL_MS);
    }

    this.pingAndObserveAgent();
    this.pingAndObserveServer();

    await this.sendMessage(SyncStageMessageType.IsDesktopAgentConnected, {}, 0, 0, false, 300);
  }

  private pingAndObserveAgent() {
    if (!this.agentPingCheckInterval) {
      this.agentPingCheckInterval = setInterval(async () => {
        if (this.lastAgentPongReceivedDate !== null && Date.now() - this.lastAgentPongReceivedDate > ALLOWED_TIME_WITHOUT_AGENT_PONG_MS) {
          console.log(
            `Websocket did not receive Pong from Agent message since ${
              (Date.now() - this.lastAgentPongReceivedDate) / 1000
            }s. Last pong date: ${this.lastAgentPongReceivedDate}`,
          );
          this.isDesktopAgentConnected = false;
          console.log('calling desktopAgentDelegate.desktopAgentDisconnected');
          this.handleDesktopAgentDisconnected();
        }
      }, AGENT_PING_INTERVAL_MS);
    }
  }

  private pingAndObserveServer() {
    if (!this.serverPingInterval) {
      this.serverPingInterval = setInterval(async () => {
        if (
          this.lastServerPongReceivedDate !== null &&
          Date.now() - this.lastServerPongReceivedDate > ALLOWED_TIME_WITHOUT_SERVER_PONG_MS
        ) {
          console.log(
            `Websocket did not receive Pong from Server message since ${
              (Date.now() - this.lastServerPongReceivedDate) / 1000
            }s. Last pong date: ${this.lastServerPongReceivedDate}`,
          );
          this.isWebsocketConnectionLive = false;
          console.log('calling desktopAgentDelegate.handleBrowserDisconnected');

          if (this.lastConnectedDate && Date.now() - this.lastConnectedDate > ALLOWED_TIME_WITHOUT_SERVER_PONG_MS) {
            this.handleBrowserDisconnected();
          }
        }
        await this.sendMessage(SyncStageMessageType.ServerPing, {}, 0, WAIT_FOR_RESPONSE_TIMEOUT_MS, false);
      }, SERVER_PING_INTERVAL_MS);
    }
  }

  private async onMessage(event: MessageEvent<any>) {
    try {
      const data: IWebsocketPayload = JSON.parse(event.data.toString()) as IWebsocketPayload;
      const { msgId, type, content } = data;

      if (type === SyncStageMessageType.Pong || type == SyncStageMessageType.DesktopAgentConnected) {
        if (!this.isDesktopAgentConnected) {
          this.desktopAgentDelegate?.desktopAgentConnected();
          await this.onDesktopAgentReconnected?.();
        }

        if (this.checkDesktopAgentInterval) {
          clearInterval(this.checkDesktopAgentInterval);
          this.checkDesktopAgentInterval = null;
        }

        this.isDesktopAgentConnected = true;
        this.lastAgentPongReceivedDate = Date.now();
        this.onDesktopAgentAquiredStatus(false);

        if (type === SyncStageMessageType.Pong) {
          this.onProvisionedState(content.isProvisioned);
        }
      } else if (type == SyncStageMessageType.DesktopAgentDisconnected) {
        this.isDesktopAgentConnected = false;
      } else if (type == SyncStageMessageType.ServerPong) {
        if (!this.isWebsocketConnectionLive) {
          this.desktopAgentDelegate?.browserConnected();
          this.onDesktopAgentReconnected?.();
        }
        this.lastServerPongReceivedDate = Date.now();
        this.isWebsocketConnectionLive = true;
      }

      if (type !== SyncStageMessageType.Pong && type !== SyncStageMessageType.ServerPong) {
        console.log(`Websocket received: ${event.data}`);
      }

      if (this.requests.has(msgId)) {
        if (type === SyncStageMessageType.Incompatible) {
          console.log('Requested method is not compatible with the current version of the Desktop Agent.');
        }
        const { resolve } = this.requests.get(msgId) as IPendingRequest;
        resolve(data);
        this.requests.delete(msgId);
      } else if (type !== SyncStageMessageType.Pong && type !== SyncStageMessageType.ServerPong) {
        console.log(`${type} handling as delegate.`);
        this.onDelegateMessage(type, content);
      }
    } catch (error) {
      if (event.data !== '') {
        console.log(`Could not parse websocket message  ${event.data} : ${error}`);
      }
    }
  }

  private async onClose() {
    console.log('Disconnected from WebSocket server.');
    if (this.sarus) {
      this.sarus.messages = [];
    }
  }

  private async onError(error: Event) {
    console.log('WebSocket error:', error);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const online = await isOnline();
    this.connectionErrorCount++;
    if (online && this.connectionErrorCount >= ERROR_CONNECTIONS_BEFORE_AQUIRED) {
      this.onDesktopAgentAquiredStatus(true);
    }
  }
  public desktopAgentConnected(): boolean {
    return this.isDesktopAgentConnected;
  }

  async sendMessage(
    type: SyncStageMessageType,
    content: any,
    retries = 0,
    responseTimeout: number = WAIT_FOR_RESPONSE_TIMEOUT_MS,
    waitForResponse = true,
    delay = 0,
  ): Promise<IWebsocketPayload | null> {
    if (delay) {
      await new Promise((r) => setTimeout(r, 0));
    }

    const msgId = uuidv4();
    const payload: IWebsocketPayload = {
      type,
      msgId,
      time: new Date().toISOString(),
      errorCode: 0,
      content,
    };
    const strPayload = JSON.stringify(payload);

    if (type !== SyncStageMessageType.Ping && type !== SyncStageMessageType.ServerPing) {
      console.log(`Sending to WS: ${strPayload}. Websocket is alive: ${this.isWebsocketConnectionLive}`);
    }
    if (waitForResponse) {
      try {
        this.sarus?.send(strPayload);
        const desktopAgentResponse: IWebsocketPayload = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.requests.delete(msgId);
            reject(new Error(`Timeout: ${responseTimeout / 1000}s elapsed without a response for ${type}.`));
          }, responseTimeout);

          this.requests.set(msgId, { resolve, timeout });
        });

        return desktopAgentResponse;
      } catch (error) {
        console.log(`Have not received a response for message ${msgId}. Error: ${error}`);
        if (retries) {
          console.log(`Retries left: ${retries} for ${type}`);
          return this.sendMessage(type, content, retries - 1, responseTimeout, waitForResponse);
        } else {
          return null;
        }
      }
    } else {
      try {
        this.sarus?.send(strPayload);
      } catch (error) {
        console.log(`Could not send message ${msgId} to the Desktop Agent. Error: ${error}`);
        if (retries) {
          console.log(`Retries left: ${retries} for ${type}`);
          return this.sendMessage(type, content, retries - 1, responseTimeout, waitForResponse);
        }
      }
      return null;
    }
  }
}
