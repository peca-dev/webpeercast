import { EventEmitter } from "fbemitter";

export declare class LocalPeer extends EventEmitter {
    constructor(url: string);
    broadcast(data: any): void;
}
