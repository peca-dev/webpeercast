import * as debugStatic from 'debug';
import * as http from 'http';
import { Downstream } from 'p2pcommunication-common';
import RootServer from '../RootServer';

const debug = debugStatic('p2pcommunication:server');

export const ROOT_SERVER_ID = '00000000-0000-0000-0000-000000000000';
export const SERVER_MAX_CLIENTS = 3;
export const CLIENT_MAX_CLIENTS = 2;
export const PORT = 8080;

export async function createServer() {
  let server: RootServer<{}>;
  const httpServer = http.createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.writeHead(200);
    response.end(createDebugJSON((<any>server).localPeer.downstreams));
  });
  server = new RootServer(httpServer, SERVER_MAX_CLIENTS);
  return new Promise<{ close(): void }>((resolve, reject) => {
    httpServer.listen(PORT, () => {
      debug(`${new Date()} Server is listening on port ${PORT}`);
      resolve(httpServer);
    });
  });
}

function createDebugJSON(
  downstreams: Set<Downstream<{ id: string }>>,
) {
  return JSON.stringify({
    clients: [...downstreams].map(x => ({ id: x.id })),
  });
}
