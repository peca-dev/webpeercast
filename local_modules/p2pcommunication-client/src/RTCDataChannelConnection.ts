import * as debugStatic from 'debug';
import { Observable, Subject } from 'rxjs';

const debug = debugStatic('p2pcommunication-client:RTCDataChannelConnection');

export default class RTCDataChannelConnection {
  readonly message = new Subject<{ type: string, payload: any }>();
  readonly error: Observable<ErrorEvent>;
  readonly closed: Observable<ErrorEvent>;

  constructor(
    private readonly peerConnection: RTCPeerConnection,
    private readonly dataChannel: RTCDataChannel,
  ) {
    dataChannel.addEventListener('message', (message: MessageEvent) => {
      try {
        switch (message.type) {
          case 'message':
            this.message.next(JSON.parse(message.data));
            break;
          default:
            throw new Error('Unsupported message type: ' + message.type);
        }
      } catch (e) {
        debug(e);
      }
    });
    this.error = Observable.fromEvent<ErrorEvent>(dataChannel, 'error');
    this.closed = Observable.fromEvent<Event>(dataChannel, 'close');
    this.closed.subscribe(e => {
      peerConnection.close();
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
