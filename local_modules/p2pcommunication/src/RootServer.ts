import * as debugStatic from 'debug';
import * as http from 'http';
import { LocalPeer, provideConnection, RemotePeer } from 'p2pcommunication-common';
import { Subject } from 'rxjs';
import * as uuid from 'uuid';
import * as WebSocket from 'ws';
import * as declaration from '../index';
import ServerWebSocketConnection from './ServerWebSocketConnection';

const debug = debugStatic('p2pcommunication:RootServer');
const INVAILD_ID = 'fffffffff-ffff-ffff-ffff-fffffffffffff';

export default class RootServer<T> implements declaration.RootServer<T> {
  private remotePeerRepo = new ServerRemotePeerRepo();
  private readonly localPeer = new LocalPeer<T>(this.remotePeerRepo, 10, true);
  private wsServer: WebSocket.Server;
  readonly maxClients = 10;
  private selectTarget = -1;
  readonly id = '00000000-0000-0000-0000-000000000000';

  onConnected = this.localPeer.onConnected;

  constructor(httpServer: http.Server) {
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
    debug('Connection count:', this.wsServer.clients.length);
    const clientCount = this.localPeer.downstreams.size;
    if (clientCount >= this.maxClients) {
      return this.provideOneDownstreamsDownstreamConnects(this.createRemotePeer(INVAILD_ID, ws))
        .then(() => {
          ws.close();
        });
    }
    const remotePeer = this.createRemotePeer(uuid.v4(), ws);
    this.remotePeerRepo.downstreamAdded.next(remotePeer);
    return Promise.resolve();
  }

  private createRemotePeer(uuid: string, ws: WebSocket) {
    const remotePeer = new RemotePeer<T>(uuid, new ServerWebSocketConnection(ws));
    remotePeer.onBroadcasting.subscribe((payload) => {
      // NOP
    });
    remotePeer.sendId();
    debug((new Date()) + ' Connection accepted.');
    return remotePeer;
  }

  private async provideOneDownstreamsDownstreamConnects(remotePeer: RemotePeer<{}>) {
    debug('Add downstream');
    await provideConnection(
      remotePeer,
      'toDownstreamOf',
      this.selectOne([...this.localPeer.downstreams]),
    );
  }

  private selectOne<T>(array: T[]): T {
    this.selectTarget += 1;
    if (this.selectTarget >= array.length) {
      this.selectTarget = 0;
    }
    return array[this.selectTarget];
  }
}

function originIsAllowed(origin: string) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

class ServerRemotePeerRepo<T> {
  downstreamAdded = new Subject<RemotePeer<T>>();
}
