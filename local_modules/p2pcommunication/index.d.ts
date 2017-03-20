import * as http from 'http';
import { Subscribable } from 'rxjs/Observable';

export declare class RemotePeer<T> {
  broadcast(payload: T): void
}

export declare class RootServer<T> {
  onConnected: Subscribable<{ peerType: "upstream" | "otherStream" | "downstream"; remotePeer: RemotePeer<T>; }>;

  constructor(httpServer: http.Server);

  broadcast(payload: T): void;
}
