import * as Rx from "rxjs";
import { PeerType, RemotePeer } from "p2pcommunication-common";

export declare class LocalPeer<T> {
    onConnected: Rx.Observable<{ peerType: PeerType; remotePeer: RemotePeer<T>; }>;
    onBroadcastReceived: Rx.Observable<T>;

    constructor(url: string);
    disconnect(): void;
    broadcast(data: T): void;
}
