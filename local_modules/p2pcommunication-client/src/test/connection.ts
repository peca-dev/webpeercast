import * as assert from 'power-assert';
import LocalPeer from '../LocalPeer';
import { fetchServerStatus, server, waitOtherPeer } from './utils';

describe('Connection', () => {
  context('between two peers', () => {
    let peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(peers, 2);
    });

    it('connects to server', async () => {
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === 2);
      assert(peers[0].debug.hasPeer(peers[1].id));
      assert(peers[1].debug.hasPeer(peers[0].id));
    });

    after(async () => {
      await closeAll(peers);
    });
  });

  context('between many peers on one layer', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);

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
    });

    after(async () => {
      await closeAll(peers);
    });
  });

  context('between many many peers on one layer', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);

    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(peers, 11);
    });

    it('connects to server', async () => {
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === peers.length);
      assert(peers.every(
        x => peers
          .filter(y => y.id !== x.id)
          .every(y => y.debug.hasPeer(x.id)),
      ));
    });

    after(async () => {
      await closeAll(peers);
    });
  });
});

async function initPeers(peers: LocalPeer<{}>[], numPeers: number) {
  const serverStatus1 = await fetchServerStatus();
  const oldClients = serverStatus1.clients.length;
  for (let i = 0; i < numPeers; i += 1) {
    peers.push(new LocalPeer(`ws://${server}`));
  }
  await new Promise((resolve, reject) => {
    let count = peers.length;
    const countDown = () => {
      count -= 1;
      if (count === 0) {
        resolve();
      }
    };
    for (const peer of peers) {
      waitOtherPeer(peer, countDown);
    }
  });
  const serverStatus2 = await fetchServerStatus();
  assert(serverStatus2.clients.length - oldClients === numPeers);
}

async function closeAll(peers: LocalPeer<{}>[]) {
  for (const x of peers) {
    x.disconnect();
  }
  await new Promise(
    (resolve, reject) => setTimeout(resolve, 1 * 1000),
  );
  const serverStatus = await fetchServerStatus();
  assert(serverStatus.clients.length === 0);
}
