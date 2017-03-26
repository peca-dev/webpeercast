import { LocalPeer } from 'p2pcommunication-client';
import * as assert from 'power-assert';
import * as Rx from 'rxjs';
import { AnonymousSubscription } from 'rxjs/Subscription';
import { SERVER_MAX_CLIENTS } from './server';
import { closeAll, initPeerTree } from './utils';

describe('Sharing', () => {
  context('between two peers', () => {
    const PEERS_COUNT = 2;
    const peers = <LocalPeer<string>[]>[];

    before(() => initPeerTree(peers, PEERS_COUNT));
    after(() => closeAll(peers));

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
  });

  [3, 6, 12].forEach((peersCount) => {
    context(`between ${peersCount} peers`, function () {
      // tslint:disable-next-line:no-invalid-this
      this.timeout(60 * 1000);

      const peers = <LocalPeer<{}>[]>[];

      before(() => initPeerTree(peers, peersCount));
      after(() => closeAll(peers));

      if (peersCount <= SERVER_MAX_CLIENTS) {
        it('has one upstream', () => {
          for (const peer of peers) {
            assert((<any>peer).debug.getUpstreams().size === 1);
          }
        });

        it('has otherStreams', () => {
          for (const peer of peers) {
            assert((<any>peer).debug.getOtherStreams().size === peersCount - 1);
          }
        });

        it('has no downstream', () => {
          for (const peer of peers) {
            assert((<any>peer).debug.getDownstreams().size === 0);
          }
        });
      }

      [...Array(peersCount).keys()].forEach((index) => {
        it(`receive message from peer[${index}]`, () => {
          assert(peers.length === peersCount);
          const testPeer = peers[index];
          return testPing(testPeer, peers.filter(x => x !== testPeer));
        });
      });
    });
  });
});

function testPing(source: LocalPeer<string>, targets: LocalPeer<string>[]) {
  return new Promise((resolve, reject) => {
    const subscriptions: AnonymousSubscription[] = [];
    const unsubscribeAll = () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    };
    const success = () => {
      unsubscribeAll();
      // tslint:disable-next-line:no-param-reassign
      reject = () => { /* NOP */ };
      resolve();
      // tslint:disable-next-line:no-param-reassign
      resolve = () => { /* NOP */ };
    };
    const fail = () => {
      unsubscribeAll();
      // tslint:disable-next-line:no-param-reassign
      resolve = () => { /* NOP */ };
      reject();
      // tslint:disable-next-line:no-param-reassign
      reject = () => { /* NOP */ };
    };
    const data = `${Date.now()}`;
    Rx.Observable
      .zip(...targets.map((target) => {
        const subject = new Rx.Subject();
        subscriptions.push(target.onBroadcastReceived
          .subscribe((x) => {
            if (subject.next != null) {
              assert(x === data);
              subject.next(x);
              subject.next = <any>null;
              return;
            }
            fail();
          }));
        return subject;
      }))
      .subscribe({
        next: success,
        error: fail,
      });
    source.broadcast(data);
  });
}
