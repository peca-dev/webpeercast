import * as http from "http";
import * as p2pCommunication from "p2pcommunication";

import { Query } from "../query";
// import { getLogger } from "log4js";
// const logger = getLogger();

export default class RootServer<T extends { id: string }> {
    private server: p2pCommunication.RootServer;
    private eventQueue: Array<Query<T>> = [];

    constructor(httpServer: http.Server) {
        this.server = new p2pCommunication.RootServer(httpServer);
        this.server.addListener("connect", (remoteClient: p2pCommunication.RemoteClient) => {
            remoteClient.broadcast(this.eventQueue);
        });
    }
}
