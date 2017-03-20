import { Subscribable } from 'rxjs/Observable';

export declare class LocalPeer<T> {
  onConnected: Subscribable<{ peerType: "upstream" | "otherStream" | "downstream"; remotePeer: { id: string }; }>;
  onBroadcastReceived: Subscribable<T>;

  constructor(url: string);
  disconnect(): void;
  broadcast(data: T): void;
}
