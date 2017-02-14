import { EventEmitter } from "fbemitter";

export declare class LocalPeer extends EventEmitter {
    constructor(url: string);
    disconnect(): void;
    broadcast(data: any): void;
}
