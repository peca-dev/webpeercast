import * as assert from 'power-assert';
import LocalPeer from '../LocalPeer';
import { fetchServerStatus, server, waitOtherPeer } from './utils';

describe('Connection', () => {
  context('between two peers', () => {
    let a: LocalPeer<{}>;
    let b: LocalPeer<{}>;

    before(async () => {
      a = new LocalPeer(`ws://${server}`);
      b = new LocalPeer(`ws://${server}`);
      await new Promise((resolve, reject) => {
        let count = 2;
        const countDown = () => {
          count -= 1;
          if (count === 0) {
            resolve();
          }
        };
        waitOtherPeer(a, countDown);
        waitOtherPeer(b, countDown);
      });
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === 2);
    });

    it('connects to server', async () => {
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === 2);
      assert(a.debug.hasPeer(b.id));
      assert(b.debug.hasPeer(a.id));
    });

    after(async () => {
      a.disconnect();
      b.disconnect();
      await new Promise(
        (resolve, reject) => setTimeout(resolve, 1 * 1000),
      );
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === 0);
    });
  });

  context('between many peers on one layer', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);

    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      for (let i = 0; i < 10; i += 1) {
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
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === 10);
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
      for (const x of peers) {
        x.disconnect();
      }
      await new Promise(
        (resolve, reject) => setTimeout(resolve, 1 * 1000),
      );
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length === 0);
    });
  });
});
