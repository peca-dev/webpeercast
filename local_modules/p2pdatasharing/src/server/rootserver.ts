import * as http from "http";
import * as p2pCommunication from "p2pcommunication";
import { Query } from "../query";

export default class RootServer<T extends { id: string }> {
    private server: p2pCommunication.RootServer;
    private eventQueue: Array<Query<T>> = [];

    constructor(httpServer: http.Server) {
        this.server = new p2pCommunication.RootServer(httpServer);
        this.server.onConnected.subscribe(remoteClient => {
            remoteClient.broadcast(this.eventQueue);
        });
    }

    pushAll(queries: ReadonlyArray<Query<T>>) {
        for (let query of queries) {
            this.eventQueue.push(query);
        }
        for (let client of this.server.remoteClients) {
            client.broadcast(queries);
        }
    }
}
