import { v4 as uuidv4 } from 'uuid';
import { SyncStageMessageType } from './SyncStageMessageType';

const WAIT_FOR_CONNECTION_BEFORE_SENDING_MS = 5000;
const RECONNECT_INTERVAL_MS = 4000;
const WAIT_FOR_RESPONSE_TIMEOUT_MS = 20000;
const PING_INTERVAL_MS = 5000;
const ALLOWED_TIME_WITHOUT_PONG_MS = 15000;
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
  private url: string;
  private ws: WebSocket;
  private requests: Map<string, IPendingRequest>;
  private onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void;
  private connected = false;
  private pingInterval: any;
  private reconnectInterval: any;
  private lastPongReceivedDate: number | null = null;
  private lastConnectedDate: number | null = null;
  private controlledDisconnection = false;
  private websocketId: string;
  public onWebsocketReconnected: (() => void) | null = null;

  constructor(
    url: string,
    onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void,
    onWebsocketReconnected: () => void,
  ) {
    this.url = url;
    this.websocketId = uuidv4();
    this.onDelegateMessage = onDelegateMessage;
    this.ws = new WebSocket(url);
    this.requests = new Map();
    this.registerListenersOnWebsocket();
    this.onWebsocketReconnected = onWebsocketReconnected;

    // Attach the event listener for tab/window close
    window.addEventListener('beforeunload', (event) => {
      this.closeWebSocket();
      event.preventDefault();
      event.returnValue = ''; // Chrome requires this to work correctly
    });
  }

  private closeWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  private setReconnectInterval() {
    console.log(`Will reconnect in ${RECONNECT_INTERVAL_MS}ms`);

    if (this.reconnectInterval !== null) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    this.reconnectInterval = setInterval(async () => {
      await this.reconnect();
    }, RECONNECT_INTERVAL_MS);
  }

  private onOpen() {
    console.log('Connected to WebSocket server');

    if (this.reconnectInterval !== null) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.controlledDisconnection = false;

    this.connected = true;
    this.lastPongReceivedDate = null;
    this.lastConnectedDate = Date.now();

    setTimeout(() => {
      this.sendMessage(SyncStageMessageType.AssignWebsocketId, { websocketId: this.websocketId }, 3, 5000);
    }, 500);

    this.pingInterval = setInterval(async () => {
      this.sendMessage(SyncStageMessageType.Ping, {});

      if (
        (this.lastPongReceivedDate !== null && Date.now() - this.lastPongReceivedDate > ALLOWED_TIME_WITHOUT_PONG_MS) ||
        (this.lastPongReceivedDate === null &&
          this.lastConnectedDate != null &&
          Date.now() - this.lastConnectedDate > ALLOWED_TIME_WITHOUT_PONG_MS)
      ) {
        console.log(
          `Did not receive Pong message since at least ${ALLOWED_TIME_WITHOUT_PONG_MS / 1000}s. Last pong date: ${
            this.lastPongReceivedDate
          }. Last connected date: ${this.lastConnectedDate}. Reconnecting.`,
        );
        await this.reconnect();
      }
    }, PING_INTERVAL_MS);

    if (this.onWebsocketReconnected != null) {
      console.log('onWebsocketReconnected');
      console.log(this.onWebsocketReconnected);
      this.onWebsocketReconnected();
    }
  }

  private onMessage(event: MessageEvent<any>) {
    try {
      const data: IWebsocketPayload = JSON.parse(event.data.toString()) as IWebsocketPayload;
      const { msgId, errorCode, type, content, time } = data;

      if (type !== SyncStageMessageType.Pong) {
        console.log(`Received: ${event.data}`);
      }

      if (this.requests.has(msgId)) {
        const { resolve } = this.requests.get(msgId) as IPendingRequest;
        resolve(data);
        this.requests.delete(msgId);

        if (type === SyncStageMessageType.Pong) {
          this.lastPongReceivedDate = new Date(time).getTime();
        }
      } else {
        console.log('Received message unrelated to any msgId, handling as delegate.');
        this.onDelegateMessage(type, content);
      }
    } catch (error) {
      console.log(`Could not parse websocket message  ${event.data} : ${error}`);
    }
  }

  private onClose() {
    console.log('Disconnected from WebSocket server.');
    this.connected = false;
    clearInterval(this.pingInterval);

    if (!this.controlledDisconnection) {
      this.setReconnectInterval();
    } else {
      this.registerListenersOnWebsocket();
    }

    this.controlledDisconnection = false;
  }

  private onError(error: Event) {
    console.error('WebSocket error:', error);
    clearInterval(this.pingInterval);
    this.closeWebSocket();
    this.connected = false;
    this.controlledDisconnection = false;
    this.setReconnectInterval();
  }

  private registerListenersOnWebsocket(): void {
    console.log(`Connecting to the websocket server: ${this.url}`);
    this.ws.addEventListener('open', () => {
      this.onOpen();
    });

    this.ws.addEventListener('message', (event) => {
      this.onMessage(event);
    });

    this.ws.addEventListener('close', () => {
      this.onClose();
    });

    this.ws.addEventListener('error', (error) => {
      this.onError(error);
    });
  }

  private removeWebsocketListeners() {
    this.ws.removeEventListener('open', () => {
      this.onOpen();
    });

    this.ws.removeEventListener('message', (event) => {
      this.onMessage(event);
    });

    this.ws.removeEventListener('close', () => {
      this.onClose();
    });

    this.ws.removeEventListener('error', (error) => {
      this.onError(error);
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  async reconnect() {
    console.log('Reconnecting to the websocket server...');

    try {
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        this.controlledDisconnection = true;
        this.removeWebsocketListeners();
        this.closeWebSocket();
        while (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
          console.log('Waiting for websocket to close...');
          await new Promise((r) => setTimeout(r, 400));
        }
        this.connected = false;
      }

      this.ws = new WebSocket(this.url);
      this.registerListenersOnWebsocket();
      while (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (this.onWebsocketReconnected && this.ws.readyState === WebSocket.OPEN) {
        this.onWebsocketReconnected();
      }
    } catch (error) {
      console.log(`Could not reconnect to the Websocket. ${error}`);
      return null;
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
    responseTimeout = WAIT_FOR_RESPONSE_TIMEOUT_MS,
  ): Promise<IWebsocketPayload | null> {
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

    this.ws.send(strPayload);
    try {
      const desktopAgentResponse: IWebsocketPayload = await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          this.requests.delete(msgId);
          reject(new Error(`Timeout: ${responseTimeout / 1000}s elapsed without a response for ${type}.`));
        }, responseTimeout);

        this.requests.set(msgId, { resolve, timeout });
      });

      return desktopAgentResponse;
    } catch (error) {
      console.log(`Could not send message to the Desktop Agent, or have not received a response. Error: ${error}`);
      if (retries) {
        console.log(`Retries left: ${retries} for ${type}`);
        return this.sendMessage(type, content, retries - 1);
      } else {
        return null;
      }
    }
  }
}
