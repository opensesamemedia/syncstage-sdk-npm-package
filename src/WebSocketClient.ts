import { v4 as uuidv4 } from 'uuid';
import isOnline from 'is-online';
import Sarus from '@anephenix/sarus';

import { SyncStageMessageType } from './SyncStageMessageType';
import ISyncStageDesktopAgentDelegate from './delegates/ISyncDesktopAgentDelegate';

const WAIT_FOR_RESPONSE_TIMEOUT_MS = 35000;
const PING_INTERVAL_MS = 5000;
const ISONLINE_INTERVAL_MS = 5000;
const ALLOWED_TIME_WITHOUT_PONG_MS = 30000;
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
  private url: string;
  private sarus: Sarus;
  private requests: Map<string, IPendingRequest>;
  private onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void;
  private onDesktopAgentAquiredStatus: (aquired: boolean) => void;
  private onOnline: () => void;
  private onOffline: () => void;
  private isDesktopAgentConnected = false;
  private pingInterval: any = null;
  private pingCheckInterval: any = null;
  private isOnlineInterval: any = null;
  private wasSleepingInterval: any = null;
  private watchdogInterval: any = null;
  private lastTimeActive = Date.now();
  private desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null;

  private reconnectingTimestamp: number | null = null;
  private lastPongReceivedDate: number | null = null;
  private lastConnectedDate: number | null = null;
  private onWebsocketReconnected: () => void;
  private online: boolean | null = null;
  private reconnecting = false;
  private visibilityChangeTimestamp: number | null = null;

  constructor(
    syncStageObjectId: string,
    url: string,
    onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void,
    onWebsocketReconnected: () => void,
    onDesktopAgentAquiredStatus: (aquired: boolean) => void,
    onOffline: () => void,
    onOnline: () => void,
    desktopAgentDelegate: ISyncStageDesktopAgentDelegate | null = null,
  ) {
    this.syncStageObjectId = syncStageObjectId;
    this.url = url;
    this.onDelegateMessage = onDelegateMessage;

    this.requests = new Map();
    this.onWebsocketReconnected = onWebsocketReconnected;
    this.onDesktopAgentAquiredStatus = onDesktopAgentAquiredStatus;
    this.onOnline = onOnline;
    this.onOffline = onOffline;
    this.desktopAgentDelegate = desktopAgentDelegate;

    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);
    this.onDesktopAgentAquiredStatus = this.onDesktopAgentAquiredStatus.bind(this);

    this.sarus = new Sarus({
      url: this.createWebsocketURI(),
      eventListeners: {
        open: [this.onOpen],
        message: [this.onMessage],
        close: [this.onClose],
        error: [this.onError],
      },
      reconnectAutomatically: true,
      retryConnectionDelay: 5000,
      storageType: 'memory',
      retryProcessTimePeriod: 100,
    });

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

    this.watchdogInterval = setInterval(() => {
      if (this.reconnecting && this.reconnectingTimestamp !== null) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.reconnectingTimestamp;
        if (elapsedTime > 8000) {
          // 5 seconds
          console.log('Reconnecting for more than 8 seconds, rerun sarus.reconnect().');
          this.reconnect();
        }
      }
    }, 1000); // check every second

    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      // The tab has just been hidden, record the current time
      this.visibilityChangeTimestamp = Date.now();
    } else {
      // The tab has just been shown, check how long it was hidden
      if (this.visibilityChangeTimestamp !== null) {
        const hiddenDuration = Date.now() - this.visibilityChangeTimestamp;
        if (hiddenDuration > 5 * 60 * 1000) {
          console.log('The tab was hidden for more than 5 minutes, restart the WebSocket connection.');
          if (!this.reconnecting) {
            this.reconnect();
          }
        }
      }
      this.visibilityChangeTimestamp = null;
    }
  }

  private reconnect() {
    this.sarus.messages = [];
    this.reconnecting = true;
    this.reconnectingTimestamp = Date.now();
    this.sarus.reconnect();
  }

  public updateOnWebsocketReconnected(onWebsocketReconnected: () => void) {
    if (onWebsocketReconnected) {
      this.onWebsocketReconnected = onWebsocketReconnected;
    } else {
      this.onWebsocketReconnected = () => {};
    }
  }

  private createWebsocketURI(): string {
    return `${this.url}&syncStageObjectId=${this.syncStageObjectId}&websocketId=${uuidv4()}`;
  }

  private async onOpen() {
    this.sarus.messages = [];
    this.reconnecting = false;
    this.reconnectingTimestamp = null;
    console.log(`Connected WebSocket to server`);

    this.onDesktopAgentAquiredStatus(false);
    await this.onWebsocketReconnected();

    this.lastPongReceivedDate = null;
    this.lastConnectedDate = Date.now();

    if (!this.pingInterval) {
      this.pingInterval = setInterval(async () => {
        await this.sendMessage(SyncStageMessageType.Ping, {});
      }, PING_INTERVAL_MS);
    }

    if (!this.pingCheckInterval) {
      this.pingCheckInterval = setInterval(async () => {
        if (this.lastPongReceivedDate !== null && Date.now() - this.lastPongReceivedDate > ALLOWED_TIME_WITHOUT_PONG_MS) {
          console.log(
            `Websocket did not receive Pong message since ${(Date.now() - this.lastPongReceivedDate) / 1000}s. Last pong date: ${
              this.lastPongReceivedDate
            }. Last connected date: ${this.lastConnectedDate}.`,
          );
          this.isDesktopAgentConnected = false;
          console.log('calling desktopAgentDelegate.desktopAgentLostConnection');
          this.desktopAgentDelegate?.desktopAgentDisconnected();
        }
      }, PING_INTERVAL_MS);
    }

    await this.sendMessage(SyncStageMessageType.IsDesktopAgentConnected, {}, 0, 0, false, 300);
  }

  private async onMessage(event: MessageEvent<any>) {
    try {
      const data: IWebsocketPayload = JSON.parse(event.data.toString()) as IWebsocketPayload;
      const { msgId, type, content } = data;

      if (type === SyncStageMessageType.Pong || type == SyncStageMessageType.DesktopAgentConnected) {
        this.isDesktopAgentConnected = true;
        this.lastPongReceivedDate = Date.now();
        this.onDesktopAgentAquiredStatus(false);
      } else if (type == SyncStageMessageType.DesktopAgentDisconnected) {
        this.isDesktopAgentConnected = false;
      }
      if (this.requests.has(msgId)) {
        if (type !== SyncStageMessageType.Pong) {
          console.log(`Websocket received: ${event.data}`);
        }

        const { resolve } = this.requests.get(msgId) as IPendingRequest;
        resolve(data);
        this.requests.delete(msgId);
      } else if (type !== SyncStageMessageType.Pong) {
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
    this.sarus.messages = [];
  }

  private async onError(error: Event) {
    console.log('WebSocket error:', error);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const online = await isOnline();
    if (online) {
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

    if (type !== SyncStageMessageType.Ping) {
      console.log(`Sending to WS: ${strPayload}`);
    }
    if (waitForResponse) {
      try {
        this.sarus.send(strPayload);
        const desktopAgentResponse: IWebsocketPayload = await new Promise((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            this.requests.delete(msgId);
            reject(new Error(`Timeout: ${responseTimeout / 1000}s elapsed without a response for ${type}.`));
          }, responseTimeout);

          this.requests.set(msgId, { resolve, timeout });
        });

        return desktopAgentResponse;
      } catch (error) {
        console.log(`Could not send message ${msgId} to the Desktop Agent, or have not received a response. Error: ${error}`);
        if (retries) {
          console.log(`Retries left: ${retries} for ${type}`);
          return this.sendMessage(type, content, retries - 1, responseTimeout, waitForResponse);
        } else {
          return null;
        }
      }
    } else {
      try {
        this.sarus.send(strPayload);
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
