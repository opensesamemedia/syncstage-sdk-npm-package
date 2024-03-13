import { v4 as uuidv4 } from 'uuid';
import isOnline from 'is-online';

import { SyncStageMessageType } from './SyncStageMessageType';
import SyncStageSDKErrorCode from './SyncStageSDKErrorCode';

const WAIT_FOR_CONNECTION_BEFORE_SENDING_MS = 5000;
const WAIT_FOR_RESPONSE_TIMEOUT_MS = 20000;
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
  private ws: WebSocket | null;
  private requests: Map<string, IPendingRequest>;
  private onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void;
  private onDesktopAgentAquiredStatus: (aquired: boolean) => void;
  private onOnline: () => void;
  private onOffline: () => void;
  private connected = false;
  private isDesktopAgentConnected = false;
  private pingInterval: any;
  private isOnlineInterval: any;
  private lastPongReceivedDate: number | null = null;
  private lastConnectedDate: number | null = null;
  private reconnecting = false;
  private onWebsocketReconnected: () => void;
  private onWebsocketReconnectedExecuted = false;
  private online: boolean | null = null;

  constructor(
    syncStageObjectId: string,
    url: string,
    onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void,
    onWebsocketReconnected: () => void,
    onDesktopAgentAquiredStatus: (aquired: boolean) => void,
    onOffline: () => void,
    onOnline: () => void,
  ) {
    this.syncStageObjectId = syncStageObjectId;
    this.url = url;
    this.onDelegateMessage = onDelegateMessage;
    this.ws = new WebSocket(this.createWebsocketURI());
    this.requests = new Map();
    this.registerListenersOnWebsocket();
    this.onWebsocketReconnected = onWebsocketReconnected;
    this.onDesktopAgentAquiredStatus = onDesktopAgentAquiredStatus;
    this.onOnline = onOnline;
    this.onOffline = onOffline;

    // Attach the event listener for tab/window close
    window.addEventListener('beforeunload', async (event) => {
      await this.closeWebSocket(3000);
      event.preventDefault();
      event.returnValue = ''; // Chrome requires this to work correctly
    });

    this.isOnlineInterval = setInterval(async () => {
      const online = await isOnline();
      if (this.online !== online) {
        this.online = online;
        console.log(`Network status changed to online: ${online}`);
        if (online) {
          await this.onOnline();
        } else {
          console.log('this.ws = null');
          this.removeWebsocketListeners();
          this.ws = null;
          await this.onOffline();
        }
      }
    }, ISONLINE_INTERVAL_MS);
  }

  public updateOnWebsocketReconnected(onWebsocketReconnected: () => void) {
    this.onWebsocketReconnected = onWebsocketReconnected;
  }

  private createWebsocketURI(): string {
    return `${this.url}&syncStageObjectId=${this.syncStageObjectId}&websocketId=${uuidv4()}`;
  }

  private async closeWebSocket(code?: number) {
    if (this.ws) {
      this.ws.close(code);
      await new Promise((r) => setTimeout(r, 5000));
      this.ws = null;
    }
  }

  private async onOpen() {
    console.log(`Connected WebSocket to server`);

    this.connected = true;
    this.reconnecting = false;
    this.lastPongReceivedDate = null;
    this.lastConnectedDate = Date.now();
    this.onWebsocketReconnectedExecuted = false;

    this.pingInterval = setInterval(async () => {
      await this.sendMessage(SyncStageMessageType.Ping, {});

      if (this.lastPongReceivedDate !== null && Date.now() - this.lastPongReceivedDate > ALLOWED_TIME_WITHOUT_PONG_MS) {
        console.log(
          `Websocket did not receive Pong message since ${(Date.now() - this.lastPongReceivedDate) / 1000}s. Last pong date: ${
            this.lastPongReceivedDate
          }. Last connected date: ${this.lastConnectedDate}.`,
        );
        this.isDesktopAgentConnected = false;
        await this.reconnect();
      }
    }, PING_INTERVAL_MS);

    await this.sendMessage(SyncStageMessageType.IsDesktopAgentConnected, {}, 0, 0, false, 300);
    await this.onWebsocketReconnected();
  }

  private async onMessage(event: MessageEvent<any>) {
    try {
      const data: IWebsocketPayload = JSON.parse(event.data.toString()) as IWebsocketPayload;
      const { msgId, type, content } = data;

      if (type !== SyncStageMessageType.Pong) {
        console.log(`Websocket received: ${event.data}`);
      }

      if (this.requests.has(msgId)) {
        const { resolve } = this.requests.get(msgId) as IPendingRequest;
        resolve(data);
        this.requests.delete(msgId);

        if (type === SyncStageMessageType.Pong || type == SyncStageMessageType.DesktopAgentConnected) {
          this.isDesktopAgentConnected = true;
          this.lastPongReceivedDate = Date.now();
          this.onDesktopAgentAquiredStatus(false);

          if (!this.onWebsocketReconnectedExecuted) {
            this.onWebsocketReconnectedExecuted = true;
            await this.onWebsocketReconnected();
          }
        } else if (type == SyncStageMessageType.DesktopAgentDisconnected) {
          this.isDesktopAgentConnected = false;
        }
      } else {
        console.log(`${type} handling as delegate.`);
        this.onDelegateMessage(type, content);
      }
    } catch (error) {
      console.log(`Could not parse websocket message  ${event.data} : ${error}`);
    }
  }

  private async resolveAllPendingMessagesOnDisconnected() {
    for (const msgId of this.requests.keys()) {
      const { resolve } = this.requests.get(msgId) as IPendingRequest;
      resolve({ errorCode: SyncStageSDKErrorCode.SYNCSTAGE_SERVICE_COMMUNICATION_ERROR });
      this.requests.delete(msgId);
    }
  }

  private async onClose() {
    console.log('Disconnected from WebSocket server.');
    this.connected = false;
    clearInterval(this.pingInterval);
    this.pingInterval = null;
    this.removeWebsocketListeners();
    await this.resolveAllPendingMessagesOnDisconnected();
    this.reconnect();
  }

  private async onError(error: Event) {
    console.log('WebSocket error:', error);
    this.onDesktopAgentAquiredStatus(true);
    clearInterval(this.pingInterval);
    this.pingInterval = null;
    await this.closeWebSocket();
    this.connected = false;
    await this.resolveAllPendingMessagesOnDisconnected();
    await this.reconnect();
  }

  private registerListenersOnWebsocket(): void {
    console.log(`Connecting to the websocket server: ${this.url}`);
    this.ws?.addEventListener('open', async () => {
      await this.onOpen();
    });

    this.ws?.addEventListener('message', async (event) => {
      await this.onMessage(event);
    });

    this.ws?.addEventListener('close', async () => {
      await this.onClose();
    });

    this.ws?.addEventListener('error', async (error) => {
      await this.onError(error);
    });
  }

  private removeWebsocketListeners() {
    this.ws?.removeEventListener('open', async () => {
      await this.onOpen();
    });

    this.ws?.removeEventListener('message', async (event) => {
      await this.onMessage(event);
    });

    this.ws?.removeEventListener('close', async () => {
      await this.onClose();
    });

    this.ws?.removeEventListener('error', async (error) => {
      await this.onError(error);
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public desktopAgentConnected(): boolean {
    return this.isDesktopAgentConnected;
  }

  async reconnect() {
    if (this.reconnecting) {
      console.log('Another reconnection in progress...');
      return;
    }

    this.reconnecting = true;
    console.log(`Reconnecting websocket ${this.ws?.url} to the websocket server...`);

    while (!this.online) {
      console.log(`Online status: ${this.online}, waiting for Internet connection to reconnect...`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    try {
      if (this.ws) {
        this.removeWebsocketListeners();
        await this.closeWebSocket();

        const timeout = 4000; // Timeout in milliseconds
        const startTime = Date.now();
        console.log(`Waiting for websocket to close...`);
        while (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
          if (Date.now() - startTime >= timeout) {
            console.log(`Timeout waiting for WebSocket to close.`);
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        console.log(`Websocket disconnected.`);
        this.connected = false;
      }
      this.ws = null;

      this.ws = new WebSocket(this.createWebsocketURI());

      this.registerListenersOnWebsocket();
      while (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        await new Promise((r) => setTimeout(r, 50));
      }
    } catch (error) {
      console.log(`Could not reconnect websocket ${this.ws?.url} to the server ${this.url}. ${error}`);
    } finally {
      this.reconnecting = false;
    }
  }

  private async waitForTheConnection(timeout: number = WAIT_FOR_CONNECTION_BEFORE_SENDING_MS) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (this.connected) {
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
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

    await this.waitForTheConnection();
    if (!this.connected) {
      console.log(`Cannot send ${type} message to ws, no connection.`);
      return null;
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
        this.ws?.send(strPayload);
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
        this.ws?.send(strPayload);
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
