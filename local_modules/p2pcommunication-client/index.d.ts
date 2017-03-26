import { Subscribable } from 'rxjs/Observable';

export declare class LocalPeer<T> {
  readonly onConnected: Subscribable<{ peerType: "upstream" | "otherStream" | "downstream"; remotePeer: { id: string }; }>;
  readonly onBroadcastReceived: Subscribable<T>;

  constructor(url: string, downstreamsLimit: number);
  disconnect(): void;
  broadcast(data: T): void;
}
