import { LocalPeer } from 'p2pcommunication-client';
import { RemotePeer } from 'p2pcommunication-common';
import * as assert from 'power-assert';
import { Observable } from 'rxjs';
import { createServer } from './server';
import { closeAll, fetchServerStatus, initPeerTree } from './utils';

const ROOT_SERVER_ID = '00000000-0000-0000-0000-000000000000';
const SERVER_MAX_CLIENTS = 10;
const CLIENT_MAX_CLIENTS = 2;
const PORT = 8080;
const SERVER = `127.0.0.1:${PORT}`;

let server: { close(): void };

before(async () => {
  server = await createServer(PORT);
});

after(() => {
  server.close();
});

describe('Connection', function (this) {
  // tslint:disable-next-line:no-invalid-this
  this.timeout(9 * 1000);

  context('between two peers', () => {
    const peers = <LocalPeer<{}>[]>[];

    before(() => initPeerTree(
      peers,
      SERVER,
      2,
      SERVER_MAX_CLIENTS,
      CLIENT_MAX_CLIENTS,
    ));
    after(() => closeAll(SERVER, peers));

    it('connects to server', async () => {
      const serverStatus = await fetchServerStatus(SERVER);
      assert(serverStatus.clients.length === 2);
      assert((<any>peers[0]).debug.hasPeer((<any>peers[1]).id));
      assert((<any>peers[1]).debug.hasPeer((<any>peers[0]).id));
      assert(peers.every((x: any) => Array.from(x.debug.getUpstreams()).every(
        (y: any) => y.id === ROOT_SERVER_ID,
      )));
    });
  });

  context('between many peers on one layer', () => {
    const peers = <LocalPeer<{}>[]>[];

    before(() => initPeerTree(
      peers,
      SERVER,
      SERVER_MAX_CLIENTS,
      SERVER_MAX_CLIENTS,
      CLIENT_MAX_CLIENTS,
    ));
    after(() => closeAll(SERVER, peers));

    it('connects to server', async () => {
      const serverStatus = await fetchServerStatus(SERVER);
      assert(serverStatus.clients.length === peers.length);
      assert(peers.every(
        (x: any) => peers
          .filter((y: any) => y.id !== x.id)
          .every((y: any) => y.debug.hasPeer(x.id)),
      ));
      assert(peers.every((x: any) => Array.from(x.debug.getUpstreams()).every(
        (y: any) => y.id === ROOT_SERVER_ID,
      )));
    });
  });

  describe(`limit ${SERVER_MAX_CLIENTS}`, () => {
    const peers = <LocalPeer<{}>[]>[];

    before(() => initPeerTree(
      peers,
      SERVER,
      SERVER_MAX_CLIENTS + 1,
      SERVER_MAX_CLIENTS,
      CLIENT_MAX_CLIENTS,
    ));
    after(() => closeAll(SERVER, peers));

    it(`connect ${SERVER_MAX_CLIENTS} clients to server`, async () => {
      const serverStatus1 = await fetchServerStatus(SERVER);
      assert(serverStatus1.clients.length === SERVER_MAX_CLIENTS);
    });

    it('connect upstream peers with others', async () => {
      Observable.range(0, SERVER_MAX_CLIENTS)
        .map(x => peers[x])
        .flatMap(peer => [...(<any>peer).debug.getUpstreams()])
        .subscribe((remotePeer: RemotePeer<{}>) => {
          assert(remotePeer.id === ROOT_SERVER_ID);
        });
    });

    it('connect downstream peer with upstream', async () => {
      Observable.from([...(<any>peers[SERVER_MAX_CLIENTS]).debug.getUpstreams()])
        .subscribe((remotePeer: RemotePeer<{}>) => {
          assert(remotePeer.id !== ROOT_SERVER_ID);
        });
    });
  });
});
