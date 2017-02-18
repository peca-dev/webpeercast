import * as http from "http";
import * as Rx from "rxjs";

export declare class RemoteClient {
    rtcOfferReceived: Rx.Observable<any>;
    rtcAnswerReceived: Rx.Observable<any>;
    iceCandidateReceived: Rx.Observable<any>;
    broadcastReceived: Rx.Observable<any>;
    closed: Rx.Observable<any>;
    broadcast(payload: any): void
}

export declare class RootServer {
    broadcastReceived: Rx.Observable<{ from: string; payload: any; }>;
    connected: Rx.Observable<RemoteClient>;
    constructor(httpServer: http.Server);
    get remoteClients(): RemoteClient[];
}
