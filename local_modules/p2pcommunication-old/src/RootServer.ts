import * as debugStatic from 'debug';
import * as http from 'http';
import { LocalPeer, RemotePeer } from 'p2pcommunication-common';
import { Subject } from 'rxjs';
import * as uuid from 'uuid';
import * as WebSocket from 'ws';
import * as declaration from '../index';
import ServerWebSocketConnection from './ServerWebSocketConnection';

const debug = debugStatic('p2pcommunication:RootServer');

export default class RootServer<T> implements declaration.RootServer<T> {
  private readonly remotePeerRepo = new ServerRemotePeerRepo();
  private readonly localPeer: LocalPeer<T>;
  private readonly wsServer: WebSocket.Server;
  readonly id = '00000000-0000-0000-0000-000000000000';

  readonly onConnected: typeof LocalPeer.prototype.onConnected;

  constructor(httpServer: http.Server, downstreamsLimit: number) {
    this.localPeer = new LocalPeer<T>(this.remotePeerRepo, downstreamsLimit, true);
    this.onConnected = this.localPeer.onConnected;
    this.wsServer = new WebSocket.Server({ server: httpServer });
    this.wsServer.on('connection', async (ws) => {
      try {
        const origin = ws.upgradeReq.headers.origin;
        if (!originIsAllowed(origin)) {
          ws.close();
          debug((new Date()) + ' Connection from origin ' + origin + ' rejected.');
          return;
        }
        await this.acceptNewConnection(ws);
      } catch (e) {
        console.error(e.stack || e);
      }
    });
  }

  broadcast = (payload: T) => this.localPeer.broadcast(payload);

  private acceptNewConnection(ws: WebSocket) {
    debug('Connection count:', [...this.wsServer.clients].length, this.localPeer.downstreams.size);
    const remotePeer = createRemotePeer<T>(uuid.v4(), ws);
    this.remotePeerRepo.downstreamAdded.next(remotePeer);
    return Promise.resolve();
  }
}

function createRemotePeer<T>(uuid: string, ws: WebSocket) {
  const remotePeer = new RemotePeer<T>(uuid, new ServerWebSocketConnection(ws));
  remotePeer.sendId();
  debug((new Date()) + ' Connection accepted.');
  return remotePeer;
}

function originIsAllowed(origin: string) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

class ServerRemotePeerRepo<T> {
  downstreamAdded = new Subject<RemotePeer<T>>();
}
