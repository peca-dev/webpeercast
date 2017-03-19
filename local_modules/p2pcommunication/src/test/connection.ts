import { LocalPeer } from 'p2pcommunication-client';
import { RemotePeer } from 'p2pcommunication-common';
import * as assert from 'power-assert';
import { Observable } from 'rxjs';
import { closeAll, fetchServerStatus, initPeers, waitRemotePeers } from './utils';
const ROOT_SERVER_ID = '00000000-0000-0000-0000-000000000000';
const MAX_CLIENTS = 10;
const SERVER = '127.0.0.1:8080';

describe('Connection', () => {
  describe(`limit ${MAX_CLIENTS}`, function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(9 * 1000);
    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(SERVER, peers, MAX_CLIENTS);
      for (const peer of peers) {
        await waitRemotePeers(peer, 10);
      }
      peers.push(new LocalPeer(`ws://${SERVER}`));
      await waitRemotePeers(peers[MAX_CLIENTS], 1);
    });

    it('connect', async () => {
      const serverStatus1 = await fetchServerStatus(SERVER);
      assert(serverStatus1.clients.length === MAX_CLIENTS);
      Observable.range(0, MAX_CLIENTS)
        .map(x => peers[x])
        .flatMap(peer => [...(<any>peer).debug.getUpstreams()])
        .subscribe((remotePeer: RemotePeer<{}>) => {
          assert(remotePeer.id === ROOT_SERVER_ID);
        });
      Observable.from([...(<any>peers[MAX_CLIENTS]).debug.getUpstreams()])
        .subscribe((remotePeer: RemotePeer<{}>) => {
          assert(remotePeer.id !== ROOT_SERVER_ID);
        });
    });

    after(async () => {
      await closeAll(SERVER, peers);
    });
  });

  // context('between two peers', () => {
  //   const peers = <LocalPeer<{}>[]>[];

  //   before(async () => {
  //     await initPeers(SERVER, peers, 2);
  //     for (const peer of peers) {
  //       waitRemotePeers(peer, 1);
  //     }
  //   });

  //   it('connects to server', async () => {
  //     const serverStatus = await fetchServerStatus(SERVER);
  //     assert(serverStatus.clients.length === 2);
  //     assert((<any>peers[0]).debug.hasPeer((<any>peers[1]).id));
  //     assert((<any>peers[1]).debug.hasPeer((<any>peers[0]).id));
  //     assert(peers.every((x: any) => Array.from(x.debug.getUpstreams()).every(
  //       (y: any) => y.id === ROOT_SERVER_ID,
  //     )));
  //   });

  //   after(async () => {
  //     await closeAll(SERVER, peers);
  //   });
  // });

  // context('between many peers on one layer', function (this) {
  //   // tslint:disable-next-line:no-invalid-this
  //   this.timeout(5 * 1000);

  //   const peers = <LocalPeer<{}>[]>[];

  //   before(async () => {
  //     await initPeers(SERVER, peers, 10);
  //     for (const peer of peers) {
  //       waitRemotePeers(peer, 9);
  //     }
  //   });

  //   it('connects to server', async () => {
  //     const serverStatus = await fetchServerStatus(SERVER);
  //     assert(serverStatus.clients.length === peers.length);
  //     assert(peers.every(
  //       (x: any) => peers
  //         .filter((y: any) => y.id !== x.id)
  //         .every((y: any) => y.debug.hasPeer(x.id)),
  //     ));
  //     assert(peers.every((x: any) => Array.from(x.debug.getUpstreams()).every(
  //       (y: any) => y.id === ROOT_SERVER_ID,
  //     )));
  //   });

  //   after(async () => {
  //     await closeAll(SERVER, peers);
  //   });
  // });
});
