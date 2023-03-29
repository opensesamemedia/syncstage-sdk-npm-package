import { v4 as uuidv4 } from 'uuid';
import { SyncStageMessageType } from './SyncStageMessageType';

const WAIT_FOR_CONNECTION_BEFORE_SENDING_MS = 5000;
const RECONNECT_INTERVAL_MS = 2000;
const WAIT_FOR_RESPONSE_TIMEOUT_MS = 10000;
const PING_INTERVAL_MS = 5000;
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
  private reconnectInterval: number;
  private ws: WebSocket;
  private requests: Map<string, IPendingRequest>;
  private onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void;
  private connected: boolean = false;
  private pingInterval: any;

  constructor(
    url: string,
    onDelegateMessage: (responseType: SyncStageMessageType, content: any) => void,
    reconnectInterval = RECONNECT_INTERVAL_MS,
  ) {
    this.url = url;
    this.onDelegateMessage = onDelegateMessage;
    this.ws = new WebSocket(url);
    this.reconnectInterval = reconnectInterval;
    this.requests = new Map();
    this.connect();
  }

  private connect(): void {
    console.log(`Connecting to the websocket server: ${this.url}`);
    this.ws.addEventListener('open', () => {
      console.log('Connected to WebSocket server');
      this.connected = true;

      this.pingInterval = setInterval(() => {
        this.sendMessage(SyncStageMessageType.Ping, {});
      }, PING_INTERVAL_MS);
    });

    this.ws.addEventListener('message', (event) => {
      console.log(`Received: ${event.data}`);
      try {
        const data: IWebsocketPayload = JSON.parse(event.data.toString()) as IWebsocketPayload;
        const { msgId, errorCode, type, content } = data;

        if (this.requests.has(msgId)) {
          console.log(`Received response for msgId: ${msgId}  errorCode: ${errorCode}`);
          const { resolve } = this.requests.get(msgId) as IPendingRequest;
          resolve(data);
          this.requests.delete(msgId);
        } else {
          console.log('Received message unrelated to any msgId, handling as delegate.');
          this.onDelegateMessage(type, content);
        }
      } catch (error) {
        console.log(`Could not parse websocket message ${error}`);
      }
    });

    this.ws.addEventListener('close', () => {
      console.log('Disconnected from WebSocket server.');
      this.connected = false;
      clearInterval(this.pingInterval);
      console.log(`Will reconnect in ${this.reconnectInterval}ms`);
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    });

    this.ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(this.pingInterval);
      this.ws.close();
      this.connected = false;
    });
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

  async sendMessage(type: SyncStageMessageType, content: any): Promise<IWebsocketPayload | null> {
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
    console.log(`Sending to WS: ${strPayload}`);
    this.ws.send(strPayload);
    try {
      const desktopAgentResponse: IWebsocketPayload = await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          this.requests.delete(msgId);
          reject(new Error(`Timeout: ${WAIT_FOR_RESPONSE_TIMEOUT_MS / 1000}s elapsed without a response.`));
        }, WAIT_FOR_RESPONSE_TIMEOUT_MS);

        this.requests.set(msgId, { resolve, timeout });
      });

      return desktopAgentResponse;
    } catch (error) {
      console.log(`Could not send message to the Desktop Agent. ${error}`);
      return null;
    }
  }
}
