import { EventEmitter } from "fbemitter";

export declare class Peer<T> extends EventEmitter {
    constructor(url: string);
    getAll(): T[];
}
