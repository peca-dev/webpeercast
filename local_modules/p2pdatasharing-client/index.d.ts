import * as Rx from 'rxjs';

export declare class Peer<T> {
    onUpdated: Rx.Observable<{}>;

    constructor(url: string);
    disconnect(): void;
    getAll(): T[];
}
