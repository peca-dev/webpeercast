import * as http from "http";
import { server as WebSocketServer } from "websocket";
import { getLogger } from "log4js";
const logger = getLogger();

let server = http.createServer((request, response) => {
    logger.info((new Date()) + " Received request for " + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8080, () => {
    logger.info((new Date()) + " Server is listening on port 8080");
});

let wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin: string) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on("request", request => {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        logger.info((new Date()) + " Connection from origin " + request.origin + " rejected.");
        return;
    }

    let connection = request.accept("echo-protocol", request.origin);
    logger.info((new Date()) + " Connection accepted.");
    connection.on("message", message => {
        switch (message.type) {
            case "utf8":
                logger.info("Received Message: " + message.utf8Data);
                connection.sendUTF(message.utf8Data!);
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
});
