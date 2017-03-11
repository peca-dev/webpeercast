import * as http from 'http';
import { Subscribable } from 'rxjs/Observable';

export declare class RemoteClient<T> {
  broadcast(payload: T): void
}

export declare class RootServer<T> {
  onConnected: Subscribable<RemoteClient<T>>;

  constructor(httpServer: http.Server);

  broadcast(payload: T): void;
}
