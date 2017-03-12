import * as debugStatic from 'debug';
import * as http from 'http';
import { provideConnection } from 'p2pcommunication-common';
import * as Rx from 'rxjs';
import {
  connection as WebSocketConnection,
  server as WebSocketServer,
} from 'websocket';
import * as declaration from '../index';
import RemoteClientPeer from './RemoteClientPeer';

const debug = debugStatic('p2pcommunication:RootServer');

export default class RootServer<T> implements declaration.RootServer<T> {
  private wsServer: WebSocketServer;
  private clients = new WeakMap<WebSocketConnection, RemoteClientPeer<T>>();
  private readonly maxClients = 10;
  private selectTarget = -1;
  readonly id = '00000000-0000-0000-0000-000000000000';

  onConnected = new Rx.Subject<RemoteClientPeer<T>>();

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

  broadcast(payload: T) {
    const remotePeers = this.wsServer
      .connections
      .map(x => this.clients.get(x) !)
      .filter(x => x != null);
    for (const remotePeer of remotePeers) {
      remotePeer.broadcast(payload);
    }
  }

  private async acceptNewConnection(connection: WebSocketConnection) {
    debug('Connection count:', this.wsServer.connections.length);
    const remoteClient = new RemoteClientPeer(connection);
    remoteClient.onBroadcasting.subscribe((payload) => {
      // NOP
    });
    debug((new Date()) + ' Connection accepted.');

    const clients = this.remoteClientsWithoutConnection(connection);
    if (clients.length >= this.maxClients) {
      debug('Add downstream');
      await provideConnection(remoteClient, 'toDownstreamOf', this.selectOne(clients));
      connection.close();
      return;
    }
    this.clients.set(connection, remoteClient);
    this.onConnected.next(remoteClient);
    if (clients.length < 1) {
      return;
    }
    debug('Add otherStream');
    this.startToConnectOtherPeer(connection, remoteClient);
  }

  private startToConnectOtherPeer(connection: WebSocketConnection, client: RemoteClientPeer<T>) {
    this.wsServer.connections
      .filter(x => x !== connection)
      .map(x => this.clients.get(x) !)
      .map(otherClient => provideConnection(otherClient, 'toOtherStreamOf', client)
        .catch(e => console.error(e)));
  }

  private remoteClientsWithoutConnection(connection: WebSocketConnection) {
    return this.wsServer
      .connections
      .filter(x => x !== connection)
      .map(x => this.clients.get(x) !)
      .filter(x => x != null);
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
