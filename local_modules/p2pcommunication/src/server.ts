try { require("source-map-support").install(); } catch (e) { /* empty */ }
import * as http from "http";
import {
    server as WebSocketServer,
    connection as WebSocketConnection,
} from "websocket";
import RootServer from "./rootserver";
import { getLogger } from "log4js";
const logger = getLogger(__filename);
const debug = process.env.NODE_ENV === "development";

async function main() {
    let server: RootServer<{}>;
    let httpServer = http.createServer((request, response) => {
        if (debug) {
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.writeHead(200);
            response.end(createDebugJSON((<any>server).wsServer, (<any>server).clients));
            return;
        }
        logger.info((new Date()) + " Received request for " + request.url);
        response.writeHead(404);
        response.end();
    });
    server = new RootServer(httpServer);
    httpServer.listen(8080, () => {
        logger.info((new Date()) + " Server is listening on port 8080");
    });
}

function createDebugJSON(wsServer: WebSocketServer, clients: WeakMap<WebSocketConnection, { id: string }>) {
    return JSON.stringify({
        clients: wsServer.connections
            .map(x => clients.get(x) !)
            .map(x => ({ id: x.id })),
    });
}

main().catch(e => console.error(e.stack || e));
