import { v4 as uuidv4 } from 'uuid';
import { SyncStageMessageType } from './SyncStageMessageType';

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

export default class  {
  private url: string;
  private reconnectInterval: number;
  private ws: WebSocket;
  private requests: Map<string, IPendingRequest>;

  constructor(url: string, reconnectInterval = 1000) {
    this.url = url;
    this.ws = new WebSocket(url);
    this.reconnectInterval = reconnectInterval;
    this.requests = new Map();
    this.connect();
  }

  private connect(): void {
    console.log(`Connecting to the websocket server: ${this.url}`)
    this.ws.addEventListener('open', () => {
      console.log('Connected to WebSocket server');
    });

    this.ws.addEventListener('message', (event) => {
      console.log(`Received: ${event.data}`);
      try{
        const data: IWebsocketPayload = JSON.parse(event.data.toString());
        const { msgId, content } = data;
  
        if (this.requests.has(msgId)) {
          const { resolve } = this.requests.get(msgId) as IPendingRequest;
          resolve(content);
          this.requests.delete(msgId);
        }
      }catch(error){
        console.log(`Could not parse websocket message ${error}`);
      }
      
    });

    this.ws.addEventListener('close', () => {
      console.log('Disconnected from WebSocket server');
      console.log(`Will reconnect in ${this.reconnectInterval}ms`);
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    });

    this.ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.ws.close();
    });
  }


  async sendMessage(type: SyncStageMessageType, content: any): Promise<any> {
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

    return await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.requests.delete(msgId);
        reject(new Error('Timeout: 10s elapsed without a response'));
      }, 10000);

      this.requests.set(msgId, { resolve, timeout });
    });
  }
}
