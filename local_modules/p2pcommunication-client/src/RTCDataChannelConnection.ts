import { Observable, Subject } from 'rxjs';
import { Connection } from './connection';

export default class RTCDataChannelConnection implements Connection {
  readonly message = new Subject<{ type: string, payload: any }>();
  readonly error: Observable<ErrorEvent>;
  readonly closed: Observable<ErrorEvent>;

  constructor(
    private readonly peerConnection: RTCPeerConnection,
    private readonly dataChannel: RTCDataChannel,
  ) {
    this.dataChannel.addEventListener('message', (e: MessageEvent) => {
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
    this.error = Observable.fromEvent<ErrorEvent>(this.dataChannel, 'error');
    this.closed = Observable.fromEvent<Event>(this.dataChannel, 'close').first();
    this.closed.subscribe((e) => {
      this.peerConnection.close();
    });
  }

  close() {
    this.dataChannel.close();
    this.peerConnection.close();
  }

  send(type: string, payload: {}) {
    this.dataChannel.send(JSON.stringify({ type, payload }));
  }
}
