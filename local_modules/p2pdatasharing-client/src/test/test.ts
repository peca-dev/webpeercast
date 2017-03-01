// tslint:disable-next-line:no-reference
/// <reference path="../../typings/index.d.ts" />
import * as assert from 'power-assert';
import Peer from '../Peer';

const server = '127.0.0.1:8080';

// ルートサーバーから送った情報を任意のタイミングでAから取得できる
// Bから送った情報を任意のタイミングでAから取得できる

describe('Peer', function () {
  this.timeout(10 * 1000);

  describe('when data spawn from server', () => {
    const testData = [{ id: '1', this: 'this', is: 'is', test: 'test', data: 12345678 }];
    before(async () => {
      await postTestData(testData);
    });

    it('has all data', async () => {
      const array = <Promise<Peer<typeof testData[0]>>[]>[];
      for (let i = 0; i < 10; i += 1) {
        array.push(new Promise((resolve, reject) => {
          const peer = new Peer<typeof testData[0]>(`ws://${server}`);
          const description = peer.onUpdated.subscribe(() => {
            description.unsubscribe();
            const data = peer.getAll();
            assert(data.length === testData.length);
            for (let j = 0; j < data.length; j += 1) {
              assert(data[j].this === testData[j].this);
              assert(data[j].is === testData[j].is);
              assert(data[j].test === testData[j].test);
              assert(data[j].data === testData[j].data);
            }
            resolve(peer);
          });
        }));
      }
      const results = await Promise.all(array);
      for (const result of results) {
        result.disconnect();
      }
    });

    after(async () => {
      await clearTestData();
    });
  });

  describe('when data spawn from server incrementaly', () => {
    before(async () => {
      await postTestData([]);
    });

    it('has added data', async () => {
      let peer: Peer<{ id: string, data: string }> = <any>null;
      await new Promise(async (resolve, reject) => {
        peer = new Peer<{ id: string, data: string }>(`ws://${server}`);
        const description = peer.onUpdated.subscribe(() => {
          description.unsubscribe();
          resolve();
        });
      });
      const data0 = peer.getAll();
      assert(data0.length === 0);
      await waitUpdateAfterAction(
        peer,
        () => postTestData([{ id: '1', data: 'one' }]),
      );
      const data1 = peer.getAll();
      assert(data1.length === 1);
      assert(data1.filter(x => x.id === '1')[0].data === 'one');
      await waitUpdateAfterAction(
        peer,
        () => postTestData([{ id: '2', data: 'two' }]),
      );
      const data2 = peer.getAll();
      assert(data2.length === 2);
      assert(data2.filter(x => x.id === '1')[0].data === 'one');
      assert(data2.filter(x => x.id === '2')[0].data === 'two');
      await waitUpdateAfterAction(
        peer,
        () => postTestData([{ id: '3', data: 'three' }]),
      );
      const data3 = peer.getAll();
      assert(data3.length === 3);
      assert(data3.filter(x => x.id === '1')[0].data === 'one');
      assert(data3.filter(x => x.id === '2')[0].data === 'two');
      assert(data3.filter(x => x.id === '3')[0].data === 'three');
    });

    after(async () => {
      await clearTestData();
    });
  });

  function waitUpdateAfterAction(peer: Peer<any>, action: () => void) {
    return new Promise(async (resolve, reject) => {
      const description = peer.onUpdated.subscribe(() => {
        description.unsubscribe();
        resolve();
      });
      action();
    });
  }
});

async function clearTestData() {
  return (
    await fetch(`http://${server}/clear`)
  ).status;
}

async function postTestData(obj: any) {
  return (
    await fetch(`http://${server}`, {
      method: 'POST',
      body: JSON.stringify(obj),
    })
  ).status;
}
