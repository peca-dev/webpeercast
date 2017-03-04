import * as assert from 'power-assert';
import LocalPeer from '../LocalPeer';
import { closeAll, initPeers } from './utils';

describe('Sharing', () => {
  context('between two peers', () => {
    const peers = <LocalPeer<string>[]>[];

    before(async () => {
      await initPeers(peers, 2);
    });

    it('with one message does', async () => {
      const messageDataA = 'message-data-a';
      const receiveA = await new Promise<string>((resolve) => {
        const subscription = peers[1].onBroadcastReceived.subscribe((data) => {
          subscription.unsubscribe();
          resolve(data);
        });
        peers[0].broadcast(messageDataA);
      });
      assert(receiveA === messageDataA);
      const messageDataB = 'message-data-b';
      const receiveB = await new Promise<string>((resolve) => {
        const subscription = peers[0].onBroadcastReceived.subscribe((data) => {
          subscription.unsubscribe();
          resolve(data);
        });
        peers[1].broadcast(messageDataB);
      });
      assert(receiveB === messageDataB);
    });

    after(async () => {
      await closeAll(peers);
    });
  });

  context('between many peers', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);
    const PEERS_COUNT = 15;

    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(peers, PEERS_COUNT);
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
      await closeAll(peers);
    });
  });

  context('between many many peers', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);
    const PEERS_COUNT = 30;

    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(peers, PEERS_COUNT);
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
      await closeAll(peers);
    });
  });
});
