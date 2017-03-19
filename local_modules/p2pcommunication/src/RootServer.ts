import * as debugStatic from 'debug';
import * as http from 'http';
import { Downstream, LocalPeer, provideConnection, RemotePeer } from 'p2pcommunication-common';
import * as uuid from 'uuid';
import {
  connection as WebSocketConnection,
  server as WebSocketServer,
} from 'websocket';
import * as declaration from '../index';
import ServerWebSocketConnection from './ServerWebSocketConnection';

const debug = debugStatic('p2pcommunication:RootServer');

export default class RootServer<T> implements declaration.RootServer<T> {
  private readonly localPeer = new LocalPeer<T>(10);
  private wsServer: WebSocketServer;
  public readonly maxClients = 10;
  private selectTarget = -1;
  readonly id = '00000000-0000-0000-0000-000000000000';

  onConnected = this.localPeer.onConnected;

  constructor(private httpServer: http.Server) {
    this.wsServer = new WebSocketServer({
      httpServer: this.httpServer,
      // You should not use autoAcceptConnections for production
      // applications, as it defeats all standard cross-origin protection
      // facilities built into the protocol and the browser.  You should
      // *always* verify the connection's origin and decide whether or not
      // to accept it.
      autoAcceptConnections: false,
    });
    this.wsServer.on('request', async (request) => {
      try {
        if (!originIsAllowed(request.origin)) {
          // Make sure we only accept requests from an allowed origin
          request.reject();
          debug((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
          return;
        }

        await this.acceptNewConnection(
          request.accept(undefined, request.origin),
        );
      } catch (e) {
        console.error(e.stack || e);
      }
    });
  }

  broadcast = (payload: T) => this.localPeer.broadcast(payload);

  private async acceptNewConnection(connection: WebSocketConnection) {
    connection.addListener('error', (e) => {
      console.error(e.stack || e);
    });
    debug('Connection count:', this.wsServer.connections.length);
    const remotePeer = new RemotePeer<T>(uuid.v4(), new ServerWebSocketConnection(connection));
    remotePeer.onBroadcasting.subscribe((payload) => {
      // NOP
    });
    remotePeer.sendId();
    debug((new Date()) + ' Connection accepted.');

    const clientCount = this.localPeer.downstreams.size;
    if (clientCount >= this.maxClients) {
      debug('Add downstream');
      await provideConnection(
        remotePeer,
        'toDownstreamOf',
        this.selectOne([...this.localPeer.downstreams]),
      );
      connection.close();
      return;
    }
    this.localPeer.addNewDownstream(remotePeer);
    if (clientCount < 1) {
      return;
    }
    debug('Add otherStream');
    this.startToConnectOtherPeer(connection, remotePeer);
  }

  private startToConnectOtherPeer(connection: WebSocketConnection, client: Downstream<T>) {
    [...this.localPeer.downstreams]
      .filter(x => x !== client)
      .map(otherClient => provideConnection(otherClient, 'toOtherStreamOf', client)
        .catch(e => console.error(e.stack || e)),
    );
  }

  // private remoteClientsWithoutConnection(connection: WebSocketConnection) {
  //   return (<RemoteClientPeer<{}>[]>[...this.localPeer.downstreams])
  //     .filter(x => x.connection !== connection)
  //     .filter(x => x != null);
  // }

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
