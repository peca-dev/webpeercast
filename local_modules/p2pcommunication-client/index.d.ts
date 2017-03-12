import { PeerType, RemotePeer } from 'p2pcommunication-common';
import { Subscribable } from 'rxjs/Observable';

export declare class LocalPeer<T> {
  onConnected: Subscribable<{ peerType: PeerType; remotePeer: RemotePeer<T>; }>;
  onBroadcastReceived: Subscribable<T>;

  constructor(url: string);
  disconnect(): void;
  broadcast(data: T): void;
}
