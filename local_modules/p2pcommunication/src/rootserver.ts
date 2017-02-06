import { EventEmitter } from "events";
import * as http from "http";
import {
    server as WebSocketServer,
    connection as WebSocketConnection,
} from "websocket";
import * as declare from "../index";
import RTCConnectionProvider from "./rtcconnectionprovider";
import RemoteClient from "./remoteclient";
import { getLogger } from "log4js";
const logger = getLogger();

/**
 * Emitting events:
 * - broadcast
 * - connect
 */
export default class RootServer extends EventEmitter implements declare.RootServer {
    private wsServer: WebSocketServer;
    private clients = new WeakMap<WebSocketConnection, RemoteClient>();
    private rtcConnectionProviders = new Set<RTCConnectionProvider>();

    get remoteClients() {
        return this.wsServer
            .connections
            .map(x => this.clients.get(x) as RemoteClient)
            .filter(x => x != null);
    }

    constructor(private httpServer: http.Server) {
        super();

        this.wsServer = new WebSocketServer({
            httpServer: this.httpServer,
            // You should not use autoAcceptConnections for production
            // applications, as it defeats all standard cross-origin protection
            // facilities built into the protocol and the browser.  You should
            // *always* verify the connection's origin and decide whether or not
            // to accept it.
            autoAcceptConnections: false,
        });
        this.wsServer.on("request", request => {
            try {
                if (!originIsAllowed(request.origin)) {
                    // Make sure we only accept requests from an allowed origin
                    request.reject();
                    logger.info((new Date()) + " Connection from origin " + request.origin + " rejected.");
                    return;
                }

                this.acceptNewConnection(
                    request.accept(undefined, request.origin),
                );
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
        this.httpServer.listen(8080, () => {
            logger.info((new Date()) + " Server is listening on port 8080");
        });
    }

    broadcast(payload: any) {
        let remotePeers = this.wsServer
            .connections
            .map(x => this.clients.get(x) as RemoteClient);
        for (let remotePeer of remotePeers) {
            remotePeer.broadcast(payload);
        }
    }

    private acceptNewConnection(connection: WebSocketConnection) {
        logger.debug("Connection count:", this.wsServer.connections.length);
        let remoteClient = new RemoteClient(connection);
        remoteClient.addListener("broadcast", (payload: any) => {
            this.emit("broadcast", { from: remoteClient.id, payload });
        });
        this.emit("connect", remoteClient);
        if (this.wsServer.connections.length > 1) {
            this.startToConnectOtherPeer(connection, remoteClient);
        }
        this.clients.set(connection, remoteClient);
        logger.info((new Date()) + " Connection accepted.");
    }

    private startToConnectOtherPeer(connection: WebSocketConnection, client: RemoteClient) {
        let provider = new RTCConnectionProvider(
            this.clients.get(randomOne(this.wsServer.connections, connection)) !,
            client,
        );
        provider.on("timeout", () => {
            this.rtcConnectionProviders.delete(provider);
        });
        this.rtcConnectionProviders.add(provider);
    }
}

function originIsAllowed(origin: string) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

function randomOne<T>(array: T[], without: T): T {
    let one = array[Math.floor(Math.random() * array.length)];
    if (one !== without) {
        return one;
    }
    return randomOne(array, without);
}
