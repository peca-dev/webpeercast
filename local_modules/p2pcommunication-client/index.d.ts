import * as Rx from "rxjs";

export declare class LocalPeer<T> {
    onBroadcastReceived: Rx.Observable<T>;

    constructor(url: string);
    disconnect(): void;
    broadcast(data: T): void;
}
