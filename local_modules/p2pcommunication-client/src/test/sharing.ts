import * as assert from 'power-assert';
import * as Rx from 'rxjs';
import LocalPeer from '../LocalPeer';
import { closeAll, initPeers } from './utils';

describe('Sharing', () => {
  context('between two peers', () => {
    const PEERS_COUNT = 2;
    const peers = <LocalPeer<string>[]>[];

    before(async () => {
      await initPeers(peers, PEERS_COUNT);
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

    for (let i = 0; i < PEERS_COUNT; i += 1) {
      it(`receive message from peer[${i}]`, ((testIndex: number) => async () => {
        assert(peers.length === PEERS_COUNT);
        const testPeer = peers[testIndex];
        await testPing(testPeer, peers.filter(x => x !== testPeer));
      })(i));
    }

    after(async () => {
      await closeAll(peers);
    });
  });

  context('between 10 peers', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5 * 1000);
    const PEERS_COUNT = 10;

    const peers = <LocalPeer<{}>[]>[];

    before(async () => {
      await initPeers(peers, PEERS_COUNT);
    });

    for (let i = 0; i < PEERS_COUNT; i += 1) {
      it(`receive message from peer[${i}]`, ((testIndex: number) => async () => {
        assert(peers.length === PEERS_COUNT);
        const testPeer = peers[testIndex];
        await testPing(testPeer, peers.filter(x => x !== testPeer));
      })(i));
    }

    after(async () => {
      await closeAll(peers);
    });
  });

  // context('between many peers', function () {
  //   // tslint:disable-next-line:no-invalid-this
  //   this.timeout(5 * 1000);
  //   const PEERS_COUNT = 15;

  //   const peers = <LocalPeer<{}>[]>[];

  //   before(async () => {
  //     await initPeers(peers, PEERS_COUNT);
  //   });

  //   for (let i = 0; i < PEERS_COUNT; i += 1) {
  //     it(`receive message from peer[${i}]`, ((testIndex: number) => async () => {
  //       // assert(peers.length === PEERS_COUNT);
  //       // const testPeer = peers[testIndex];
  //       // const promises = Promise.all(
  //       //   peers.filter(x => x !== testPeer).map(x => new Promise((resolve, reject) => {
  //       //     const subscriber = x.onBroadcastReceived.subscribe(() => {
  //       //       subscriber.unsubscribe();
  //       //       resolve();
  //       //     });
  //       //   })),
  //       // );
  //       // testPeer.broadcast('ping');
  //       // await promises;
  //       assert(peers.length === PEERS_COUNT);
  //       const testPeer = peers[testIndex];
  //       await testPing(testPeer, peers.filter(x => x !== testPeer));
  //     })(i));
  //   }

  //   after(async () => {
  //     await closeAll(peers);
  //   });
  // });

  // context('between many many peers', function () {
  //   // tslint:disable-next-line:no-invalid-this
  //   this.timeout(5 * 1000);
  //   const PEERS_COUNT = 50;

  //   const peers = <LocalPeer<{}>[]>[];

  //   before(async () => {
  //     await initPeers(peers, PEERS_COUNT);
  //   });

  //   for (let i = 0; i < PEERS_COUNT; i += 1) {
  //     it(`receive message from peer[${i}]`, ((testIndex: number) => async () => {
  //       assert(peers.length === PEERS_COUNT);
  //       const testPeer = peers[testIndex];
  //       await testPing(testPeer, peers.filter(x => x !== testPeer));
  //     })(i));
  //   }

  //   after(async () => {
  //     await closeAll(peers);
  //   });
  // });
});

function testPing(source: LocalPeer<string>, targets: LocalPeer<string>[]) {
  return new Promise((resolve, reject) => {
    Rx.Observable
      .zip(...targets.map((target) => {
        const subject = new Rx.Subject();
        const subscription = target.onBroadcastReceived
          .subscribe((x) => {
            subscription.unsubscribe();
            subject.next(x);
            target.onBroadcastReceived.subscribe(() => {
              assert.fail(NaN, NaN, 'Duplicated');
            });
          });
        return subject;
      }))
      .subscribe(
      () => {
        console.debug('resolve');
        resolve();
      },
      reject,
    );
    source.broadcast('ping');
  });
}
