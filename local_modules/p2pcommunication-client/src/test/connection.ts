import * as assert from 'power-assert';
import LocalPeer from '../LocalPeer';
import { closeAll, fetchServerStatus, initPeers } from './utils';
const ROOT_SERVER_ID = '00000000-0000-0000-0000-000000000000';

describe('Connection', () => {
  context('between two peers', () => {
    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(peers, 2);
    });

    it('connects to server', async () => {
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === 2);
      assert(peers[0].debug.hasPeer(peers[1].id));
      assert(peers[1].debug.hasPeer(peers[0].id));
      assert(peers.every(x => Array.from(x.debug.getUpstreams()).every(
        y => y.id === ROOT_SERVER_ID,
      )));
    });

    after(async () => {
      await closeAll(peers);
    });
  });

  context('between many peers on one layer', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);
    // tslint:disable-next-line:no-invalid-this
    this.retries(3);

    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(peers, 10);
    });

    it('connects to server', async () => {
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === peers.length);
      assert(peers.every(
        x => peers
          .filter(y => y.id !== x.id)
          .every(y => y.debug.hasPeer(x.id)),
      ));
      assert(peers.every(x => Array.from(x.debug.getUpstreams()).every(
        y => y.id === ROOT_SERVER_ID,
      )));
    });

    after(async () => {
      await closeAll(peers);
    });
  });

  it('limit 10', async function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(9 * 1000);
    const peers = <LocalPeer<{}>[]>[];
    try {
      await initPeers(peers, 11);
      const serverStatus1 = await fetchServerStatus();
      assert(serverStatus1.clients.length === 10);
      assert(peers.some(x => Array.from(x.debug.getUpstreams()).some(
        y => y.id !== ROOT_SERVER_ID,
      )));
      assert(peers.some(x => Array.from(x.debug.getUpstreams()).some(
        y => y.id === ROOT_SERVER_ID,
      )));
    } finally {
      await closeAll(peers);
    }
  });
});
