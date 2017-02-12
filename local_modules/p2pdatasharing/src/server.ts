try { require("source-map-support").install(); } catch (e) { /* empty */ }
import * as http from "http";
import RootServer from "./server/rootserver";
import { Query } from "./query";
import { getLogger } from "log4js";
const logger = getLogger();

const debug = process.env.NODE_ENV === "development";

async function main() {
    let server: RootServer<any>;
    let httpServer = http.createServer((request, response) => {
        if (debug) {
            if (request.url === "/clear") {
                (server as any).eventQueue.length = 0;
                response.setHeader("Access-Control-Allow-Origin", "*");
                response.writeHead(200);
                response.end();
                return;
            }
            if (request.method === "POST") {
                request.addListener("readable", () => {
                    let data = request.read(parseInt(request.headers["Content-Length"], 10));
                    if (data == null) {
                        return;
                    }
                    server.pushAll(
                        (JSON.parse(data) as ReadonlyArray<any>)
                            .map(x => <Query<any>>{ type: "set", date: new Date(), payload: x })
                    );
                    response.setHeader("Access-Control-Allow-Origin", "*");
                    response.writeHead(200);
                    response.end();
                });
                return;
            }
        }
        logger.info((new Date()) + " Received request for " + request.url + ", " + request.method);
        response.writeHead(404);
        response.end();
    });
    server = new RootServer<any>(httpServer);
    httpServer.listen(8080, () => {
        logger.info((new Date()) + " Server is listening on port 8080");
    });
}

main().catch(e => console.error(e.stack || e));
