import { Connection } from 'p2pcommunication-common';
import { Observable, Subject } from 'rxjs';
import { connection as WebSocketConnection } from 'websocket';

export default class ServerWebSocketConnection implements Connection {
  readonly message = new Subject<{ type: string, payload: any }>();
  readonly error: Observable<Error>;
  readonly closed = new Subject<{ code: number, desc: string }>();

  constructor(private readonly connection: WebSocketConnection) {
    this.connection.on('message', (message) => {
      try {
        switch (message.type) {
          case 'utf8':
            this.message.next(JSON.parse(message.utf8Data!));
            break;
          case 'binary':
            throw new Error('Unsupported message type: binary');
          default:
            throw new Error('Unsupported message type: ' + message.type);
        }
      } catch (e) {
        console.error(e.stack || e);
      }
    });
    this.error = Observable.fromEvent<Error>(this.connection, 'error');
    this.connection.addListener('close', (code, desc) => {
      this.closed.next({ code, desc });
      this.closed.complete();
    });
  }

  close() {
    this.connection.close();
  }

  send(type: string, payload: {}) {
    this.connection.send(JSON.stringify({ type, payload }));
  }
}
