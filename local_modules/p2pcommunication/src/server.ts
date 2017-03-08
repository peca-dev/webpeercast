try { require('source-map-support').install(); } catch (e) { /* empty */ }
import * as http from 'http';
import { getLogger } from 'log4js';
import {
  connection as WebSocketConnection,
  server as WebSocketServer,
} from 'websocket';
import RootServer from './RootServer';
const logger = getLogger(__filename);
const debug = process.env.NODE_ENV === 'development';

async function main() {
  let server: RootServer<{}>;
  const httpServer = http.createServer((request, response) => {
    if (debug) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.writeHead(200);
      response.end(createDebugJSON((<any>server).wsServer, (<any>server).clients));
      return;
    }
    logger.info((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
  server = new RootServer(httpServer);
  httpServer.listen(8080, () => {
    logger.info((new Date()) + ' Server is listening on port 8080');
  });
}

function createDebugJSON(
  wsServer: WebSocketServer,
  clients: WeakMap<WebSocketConnection, { id: string }>,
) {
  return JSON.stringify({
    clients: wsServer.connections
      .map(x => clients.get(x) !)
      .filter(x => x != null)
      .map(x => ({ id: x.id })),
  });
}

main().catch(e => console.error(e.stack || e));
