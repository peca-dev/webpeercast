import * as assert from 'power-assert';
import LocalPeer from '../LocalPeer';
import { fetchServerStatus, server, waitOtherPeer } from './utils';

describe('Sharing', () => {
  context('between two peers', () => {
    let a: LocalPeer<string>;
    let b: LocalPeer<string>;

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

    it('with one message does', async () => {
      const messageDataA = 'message-data-a';
      const receiveA = await new Promise<string>((resolve) => {
        const subscription = b.onBroadcastReceived.subscribe((data) => {
          subscription.unsubscribe();
          resolve(data);
        });
        a.broadcast(messageDataA);
      });
      assert(receiveA === messageDataA);
      const messageDataB = 'message-data-b';
      const receiveB = await new Promise<string>((resolve) => {
        const subscription = a.onBroadcastReceived.subscribe((data) => {
          subscription.unsubscribe();
          resolve(data);
        });
        b.broadcast(messageDataB);
      });
      assert(receiveB === messageDataB);
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

  context('between many peers', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);
    const PEERS_COUNT = 15;

    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      let count = PEERS_COUNT;
      let callback: Function;
      const countDown = () => {
        count -= 1;
        if (count === 0) {
          callback();
        }
      };
      for (let i = 0; i < PEERS_COUNT; i += 1) {
        const peer = new LocalPeer(`ws://${server}`);
        waitOtherPeer(peer, countDown);
        peers.push(peer);
      }
      // tslint:disable-next-line:promise-must-complete
      await new Promise((resolve, reject) => {
        callback = resolve;
      });
      const serverStatus = await fetchServerStatus();
      assert(serverStatus.clients.length >= 10);
    });

    for (let i = 0; i < PEERS_COUNT; i += 1) {
      it(`receive message from peer[${i}]`, ((testIndex: number) => async () => {
        assert(peers.length === PEERS_COUNT);
        const testPeer = peers[testIndex];
        const promises = Promise.all(
          peers.filter(x => x !== testPeer).map(x => new Promise((resolve, reject) => {
            const subscriber = x.onBroadcastReceived.subscribe(() => {
              subscriber.unsubscribe();
              resolve();
            });
          })),
        );
        testPeer.broadcast('ping');
        await promises;
      })(i));
    }

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
