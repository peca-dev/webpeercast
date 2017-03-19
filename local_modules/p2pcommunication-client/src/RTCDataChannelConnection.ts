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
    Observable.fromEventPattern<MessageEvent>(
      (handler: any) => this.dataChannel.onmessage = handler,
      () => this.dataChannel.onmessage = <any>null,
    ).subscribe((e) => {
      switch (e.type) {
        case 'message':
          this.message.next(JSON.parse(e.data));
          break;
        default:
          throw new Error('Unsupported message type: ' + e.type);
      }
    });
    Observable.fromEventPattern<ErrorEvent>(
      (handler: any) => this.dataChannel.onerror = handler,
      () => this.dataChannel.onerror = <any>null,
    ).subscribe((e) => {
      this.error.next(e.error);
    });
    this.closed = Observable.fromEventPattern<ErrorEvent>(
      (handler: any) => this.dataChannel.onclose = handler,
      () => this.dataChannel.onclose = <any>null,
    ).first();
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
