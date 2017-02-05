import * as http from "http";
import {
    server as WebSocketServer,
    connection as WebSocketConnection,
} from "websocket";
import { getLogger } from "log4js";
import RTCConnectionProvider from "./rtcconnectionprovider";
import YPPeer from "./yppeer";
const logger = getLogger();
const debug = process.env.NODE_ENV === "development";

export default class RootServer {
    private httpServer: http.Server;
    private wsServer: WebSocketServer;
    private clients = new WeakMap<WebSocketConnection, YPPeer>();
    private rtcConnectionProviders = new Set<RTCConnectionProvider>();

    constructor() {
        this.httpServer = http.createServer((request, response) => {
            if (debug) {
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.writeHead(200);
                response.end(this.createDebugJSON());
                return;
            }
            logger.info((new Date()) + " Received request for " + request.url);
            response.writeHead(404);
            response.end();
        });
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

    private acceptNewConnection(connection: WebSocketConnection) {
        logger.debug("Connection count:", this.wsServer.connections.length);
        let client = new YPPeer(connection);
        if (this.wsServer.connections.length > 1) {
            let provider = new RTCConnectionProvider(
                this.clients.get(randomOne(this.wsServer.connections, connection)) !,
                client,
            );
            provider.on("timeout", () => {
                this.rtcConnectionProviders.delete(provider);
            });
            this.rtcConnectionProviders.add(provider);
        }
        this.clients.set(connection, client);
        logger.info((new Date()) + " Connection accepted.");
    }

    private createDebugJSON() {
        return JSON.stringify({
            clients: this.wsServer.connections
                .map(x => this.clients.get(x) !)
                .map(x => ({ id: x.id })),
        });
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
