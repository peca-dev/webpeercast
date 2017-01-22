import * as http from "http";
import {
    server as WebSocketServer,
    connection as WebSocketConnection
} from "websocket";
import { getLogger } from "log4js";
import YPClient from "./ypclient";
const logger = getLogger();
const debug = process.env.NODE_ENV === "development";

export default class RootServer {
    private httpServer: http.Server;
    private wsServer: WebSocketServer;
    private clients = new WeakMap<WebSocketConnection, YPClient>();

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

                let connection = request.accept(undefined, request.origin);
                this.clients.set(connection, new YPClient(connection));
                logger.info((new Date()) + " Connection accepted.");
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
        this.httpServer.listen(8080, () => {
            logger.info((new Date()) + " Server is listening on port 8080");
        });
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
