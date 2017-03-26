import * as http from 'http';
import { Subscribable } from 'rxjs/Observable';

export declare class RemotePeer<T> {
  broadcast(payload: T): void
}

export declare class RootServer<T> {
  readonly onConnected: Subscribable<{ peerType: "upstream" | "otherStream" | "downstream"; remotePeer: RemotePeer<T>; }>;

  constructor(httpServer: http.Server, downstreamsLimit: number);

  broadcast(payload: T): void;
}
