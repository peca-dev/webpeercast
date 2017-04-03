import { Observable } from 'rxjs';
import * as io from 'socket.io-client';
import * as SimplePeer from 'simple-peer';

export default class RemoteClient<T> {
  readonly signaling: Observable<T>; // こいつではない誰かの？
  constructor() {
    io();
    const peer = new SimplePeer();
  }

  signal(data) {
    this.peer.signal(data);
  }
}
