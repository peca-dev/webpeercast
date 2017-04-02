import { Connection } from 'p2pcommunication-common';
import { Observable, Subject } from 'rxjs';
import * as WebSocket from 'ws';

export default class ServerWebSocketConnection implements Connection {
  readonly message = new Subject<{ type: string, payload: any }>();
  readonly error: Observable<Error>;
  readonly closed = new Subject<{ code: number, desc: string }>();

  constructor(private readonly ws: WebSocket) {
    this.ws.on('message', (data, flags) => {
      try {
        if (flags.binary) {
          throw new Error('Unsupported message type: binary');
        }
        this.message.next(JSON.parse(data));
      } catch (e) {
        console.error(e.stack || e);
      }
    });
    this.error = Observable.fromEvent<Error>(this.ws, 'error');
    this.ws.addListener('close', (code, desc) => {
      this.closed.next({ code, desc });
      this.closed.complete();
    });
  }

  close() {
    this.ws.close();
  }

  send(type: string, payload: {}) {
    this.ws.send(JSON.stringify({ type, payload }));
  }
}
