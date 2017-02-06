try { require("source-map-support").install(); } catch (e) { /* empty */ }
import * as http from "http";
import RootServer from "./server/rootserver";
import { getLogger } from "log4js";
const logger = getLogger();

const debug = process.env.NODE_ENV === "development";

async function main() {
    let server: RootServer<any>;
    let httpServer = http.createServer((request, response) => {
        if (debug) {
            if (request.method === "POST") {
                request.addListener("readable", () => {
                    let data = request.read(parseInt(request.headers["Content-Length"], 10));
                    if (data == null) {
                        return;
                    }
                    (server as any).eventQueue.length = 0;
                    for (let datum of JSON.parse(data) as ReadonlyArray<any>) {
                        (server as any).eventQueue.push({
                            type: "set",
                            date: new Date(),
                            payload: datum,
                        });
                    }
                    response.setHeader("Access-Control-Allow-Origin", "*");
                    response.writeHead(200);
                    response.end();
                });
                return;
            }
        }
        logger.info((new Date()) + " Received request for " + request.url);
        response.writeHead(404);
        response.end();
    });
    server = new RootServer<any>(httpServer);
}

main().catch(e => console.error(e.stack || e));
