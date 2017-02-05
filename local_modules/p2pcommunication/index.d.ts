import * as http from "http";
import { EventEmitter } from "events";

export declare class RemoteClient {
    broadcast(payload: any): void
}

export declare class RootServer extends EventEmitter {
    constructor(httpServer: http.Server);
}
