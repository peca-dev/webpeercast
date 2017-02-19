import * as Rx from "rxjs/Rx";

export interface RemotePeer {
    readonly id: string;

    broadcast(payload: Object): void;
    createOfferObservable: Rx.Observable<string>;
    disconnect(): void;
}
