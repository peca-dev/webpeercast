import { Observable, Subject } from 'rxjs';
import { Connection } from './connection';

export default class WebSocketConnection implements Connection {
  readonly message = new Subject<{ type: string, payload: any }>();
  readonly error: Observable<ErrorEvent>;
  readonly closed: Observable<ErrorEvent>;

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
        console.error(e);
      }
    });
    this.error = Observable.fromEvent<ErrorEvent>(this.socket, 'error');
    this.closed = Observable.fromEvent<Event>(this.socket, 'close').first();
  }

  close() {
    this.socket.close();
  }

  send(type: string, payload: {}) {
    this.socket.send(JSON.stringify({ type, payload }));
  }
}
