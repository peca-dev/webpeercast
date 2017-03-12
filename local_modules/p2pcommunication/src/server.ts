try { require('source-map-support').install(); } catch (e) { /* empty */ }
const DEBUG = process.env.NODE_ENV === 'development';
import * as debugStatic from 'debug';
if (DEBUG) {
  debugStatic.enable('p2pcommunication:*');
}

import * as http from 'http';
import { Downstream } from 'p2pcommunication-common';
import RootServer from './RootServer';

const debug = debugStatic('p2pcommunication:server');

async function main() {
  let server: RootServer<{}>;
  const httpServer = http.createServer((request, response) => {
    if (DEBUG) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.writeHead(200);
      response.end(createDebugJSON((<any>server).localPeer.downstreams));
      return;
    }
    debug((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
  server = new RootServer(httpServer);
  httpServer.listen(8080, () => {
    debug((new Date()) + ' Server is listening on port 8080');
  });
}

function createDebugJSON(
  downstreams: Set<Downstream<{ id: string }>>,
) {
  return JSON.stringify({
    clients: [...downstreams].map(x => ({ id: x.id })),
  });
}

main().catch(e => console.error(e.stack || e));
