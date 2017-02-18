import * as http from "http";
import * as Rx from "rxjs";

export declare class RemoteClient {
    broadcast(payload: any): void
}

export declare class RootServer {
    onConnected: Rx.Observable<RemoteClient>;
    constructor(httpServer: http.Server);
    get remoteClients(): RemoteClient[];
}
