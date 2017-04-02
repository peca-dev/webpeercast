import { Connection } from 'p2pcommunication-common';
import { Observable, Subject } from 'rxjs';

export default class RTCDataChannelConnection implements Connection {
  readonly message = new Subject<{ type: string, payload: any }>();
  readonly error = new Subject<Error>();
  readonly closed: Observable<{}>;

  constructor(
    private readonly peerConnection: RTCPeerConnection,
    private readonly dataChannel: RTCDataChannel,
  ) {
    Observable.fromEvent<MessageEvent>(this.dataChannel, 'message').subscribe((e) => {
      if (e.type === 'binary') {
        throw new Error('Unsupported message type: ' + JSON.stringify(e));
      }
      this.message.next(JSON.parse(e.data));
    });
    Observable.fromEvent<ErrorEvent>(this.dataChannel, 'error').subscribe((e) => {
      this.error.next(e.error);
    });
    this.closed = Observable.fromEvent<ErrorEvent>(this.dataChannel, 'close').first();
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
