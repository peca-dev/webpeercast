import { Connection } from 'p2pcommunication-common';
import { Observable, Subject } from 'rxjs';

export default class ClientWebSocketConnection implements Connection {
  readonly message = new Subject<{ type: string, payload: any }>();
  readonly error: Observable<Error>;
  readonly closed: Observable<{}>;

  constructor(private readonly socket: WebSocket) {
    this.socket.addEventListener('message', (e: MessageEvent) => {
      try {
        switch (e.type) {
          case 'message':
            this.message.next(JSON.parse(e.data));
            break;
          default:
            throw new Error('Unsupported message type: ' + e.type);
        }
      } catch (e) {
        console.error(e.stack || e);
      }
    });
    this.error = Observable.fromEvent<ErrorEvent>(this.socket, 'error')
      .map(e => e.error || new Error('Connection error'));
    this.closed = Observable.fromEvent<Event>(this.socket, 'close').first();
  }

  close() {
    this.socket.close();
  }

  send(type: string, payload: {}) {
    this.socket.send(JSON.stringify({ type, payload }));
  }
}
