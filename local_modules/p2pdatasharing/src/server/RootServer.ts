import * as http from 'http';
import * as p2pCommunication from 'p2pcommunication';
import { Query } from '../Query';

export default class RootServer<T extends { id: string }> {
    private server: p2pCommunication.RootServer<ReadonlyArray<Query<T>>>;
    private eventQueue: Query<T>[] = [];

    constructor(httpServer: http.Server) {
        this.server = new p2pCommunication.RootServer(httpServer);
        this.server.onConnected.subscribe(remoteClient => {
            remoteClient.broadcast(this.eventQueue);
        });
    }

    pushAll(queries: ReadonlyArray<Query<T>>) {
        for (const query of queries) {
            this.eventQueue.push(query);
        }
        for (const client of this.server.remoteClients) {
            client.broadcast(queries);
        }
    }
}
