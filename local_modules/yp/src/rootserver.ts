import * as http from "http";
import { server as WebSocketServer } from "websocket";
import { getLogger } from "log4js";
const logger = getLogger();

export default class RootServer {
    private httpServer = http.createServer((request, response) => {
        logger.info((new Date()) + " Received request for " + request.url);
        response.writeHead(404);
        response.end();
    });
    private wsServer = new WebSocketServer({
        httpServer: this.httpServer,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false,
    });

    constructor() {
        this.wsServer.on("request", request => {
            try {
                if (!originIsAllowed(request.origin)) {
                    // Make sure we only accept requests from an allowed origin
                    request.reject();
                    logger.info((new Date()) + " Connection from origin " + request.origin + " rejected.");
                    return;
                }

                let connection = request.accept(undefined, request.origin);
                logger.info((new Date()) + " Connection accepted.");
                connection.on("message", message => {
                    switch (message.type) {
                        case "utf8":
                            logger.info("Received Message: " + message.utf8Data);
                            if (message.utf8Data! === "ping") {
                                connection.sendUTF("pong");
                            } else {
                                connection.sendUTF(message.utf8Data!);
                            }
                            break;
                        case "binary":
                            logger.info("Received Binary Message of " + message.binaryData!.length + " bytes");
                            connection.sendBytes(message.binaryData!);
                            break;
                        default:
                            break;
                    }
                });
                connection.on("close", (reasonCode, description) => {
                    logger.info((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
                });
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
        this.httpServer.listen(8080, () => {
            logger.info((new Date()) + " Server is listening on port 8080");
        });
    }
}

function originIsAllowed(origin: string) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}
