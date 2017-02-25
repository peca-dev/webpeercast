import * as http from 'http';
import * as Rx from 'rxjs';

export declare class RemoteClient<T> {
    broadcast(payload: T): void
}

export declare class RootServer<T> {
    onConnected: Rx.Observable<RemoteClient<T>>;

    constructor(httpServer: http.Server);
    get remoteClients(): ReadonlyArray<RemoteClient<T>>;
}
