import * as http from 'http';
import { getLogger } from 'log4js';
import * as Rx from 'rxjs';
import {
  connection as WebSocketConnection,
  server as WebSocketServer,
} from 'websocket';
import * as declaration from '../index';
import RemoteClient from './RemoteClient';
import { provideConnection } from './rtcconnectionprovider';
const logger = getLogger(__filename);

export default class RootServer<T> implements declaration.RootServer<T> {
  private wsServer: WebSocketServer;
  private clients = new WeakMap<WebSocketConnection, RemoteClient<T>>();
  private readonly maxClients = 10;
  private selectTarget = -1;

  onConnected = new Rx.Subject<RemoteClient<T>>();

  get remoteClients() {
    return this.wsServer
      .connections
      .map(x => this.clients.get(x) !)
      .filter(x => x != null);
  }

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
    this.wsServer.on('request', (request) => {
      try {
        if (!originIsAllowed(request.origin)) {
          // Make sure we only accept requests from an allowed origin
          request.reject();
          logger.info((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
          return;
        }

        this.acceptNewConnection(
          request.accept(undefined, request.origin),
        );
      } catch (e) {
        logger.error(e.stack || e);
      }
    });
  }

  broadcast(payload: T) {
    const remotePeers = this.wsServer
      .connections
      .map(x => this.clients.get(x) !);
    for (const remotePeer of remotePeers) {
      remotePeer.broadcast(payload);
    }
  }

  private acceptNewConnection(connection: WebSocketConnection) {
    logger.debug('Connection count:', this.wsServer.connections.length);
    const remoteClient = new RemoteClient(connection);
    remoteClient.onBroadcasting.subscribe((payload) => {
      // NOP
    });
    this.clients.set(connection, remoteClient);
    this.onConnected.next(remoteClient);
    logger.info((new Date()) + ' Connection accepted.');

    const clients = this.remoteClientsWithoutConnection(connection);
    if (clients.length < 1) {
      return;
    }
    if (1 <= clients.length && clients.length < this.maxClients) {
      logger.debug('Add otherStream');
      this.startToConnectOtherPeer(connection, remoteClient);
      return;
    }
    if (this.maxClients <= clients.length) {
      logger.debug('Add downstream');
      provideConnection(this.randomOne(clients), false, remoteClient);
      setTimeout(() => connection.close(), 5 * 1000); // Disconnect when p2p connected
      return;
    }
  }

  private startToConnectOtherPeer(connection: WebSocketConnection, client: RemoteClient<T>) {
    this.wsServer.connections
      .filter(x => x !== connection)
      .map(x => this.clients.get(x) !)
      .map(otherClient => provideConnection(otherClient, true, client)
        .catch(e => logger.error(e)));
  }

  private remoteClientsWithoutConnection(connection: WebSocketConnection) {
    return this.wsServer
      .connections
      .filter(x => x !== connection)
      .map(x => this.clients.get(x) !)
      .filter(x => x != null);
  }

  private randomOne<T>(array: T[]): T {
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
