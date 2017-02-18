/// <reference path="../../typings/index.d.ts" />
import * as assert from "power-assert";
import Peer from "../peer";

const server = "127.0.0.1:8080";

// ルートサーバーから送った情報を任意のタイミングでAから取得できる
// Bから送った情報を任意のタイミングでAから取得できる

describe("Peer", function () { // tslint:disable-line:only-arrow-functions
    this.timeout(10 * 1000); // tslint:disable-line:no-invalid-this

    describe("when data spawn from server", () => {
        let testData = [{ id: "1", this: "this", is: "is", test: "test", data: 12345678 }];
        before(async () => {
            await postTestData(testData);
        });

        it("has all data", async () => {
            let array = <Array<Promise<Peer<typeof testData[0]>>>>[];
            for (let i = 0; i < 10; i++) {
                array.push(new Promise((resolve, reject) => {
                    let peer = new Peer<typeof testData[0]>(`ws://${server}`);
                    let description = peer.onUpdated.subscribe(() => {
                        description.unsubscribe();
                        let data = peer.getAll();
                        assert(data.length === testData.length);
                        for (let i = 0; i < data.length; i++) {
                            assert(data[i].this === testData[i].this);
                            assert(data[i].is === testData[i].is);
                            assert(data[i].test === testData[i].test);
                            assert(data[i].data === testData[i].data);
                        }
                        resolve(peer);
                    });
                }));
            }
            let results = await Promise.all(array);
            for (let result of results) {
                result.disconnect();
            }
        });

        after(async () => {
            await clearTestData();
        });
    });

    describe("when data spawn from server incrementaly", () => {
        before(async () => {
            await postTestData([]);
        });

        it("has added data", async () => {
            let peer: Peer<{ id: string, data: string }> = <any>null;
            await new Promise(async (resolve, reject) => {
                peer = new Peer<{ id: string, data: string }>(`ws://${server}`);
                let description = peer.onUpdated.subscribe(() => {
                    description.unsubscribe();
                    resolve();
                });
            });
            let data0 = peer.getAll();
            assert(data0.length === 0);
            await waitUpdateAfterAction(
                peer,
                () => postTestData([{ id: "1", data: "one" }]),
            );
            let data1 = peer.getAll();
            assert(data1.length === 1);
            assert(data1.filter(x => x.id === "1")[0].data === "one");
            await waitUpdateAfterAction(
                peer,
                () => postTestData([{ id: "2", data: "two" }]),
            );
            let data2 = peer.getAll();
            assert(data2.length === 2);
            assert(data2.filter(x => x.id === "1")[0].data === "one");
            assert(data2.filter(x => x.id === "2")[0].data === "two");
            await waitUpdateAfterAction(
                peer,
                () => postTestData([{ id: "3", data: "three" }]),
            );
            let data3 = peer.getAll();
            assert(data3.length === 3);
            assert(data3.filter(x => x.id === "1")[0].data === "one");
            assert(data3.filter(x => x.id === "2")[0].data === "two");
            assert(data3.filter(x => x.id === "3")[0].data === "three");
        });

        after(async () => {
            await clearTestData();
        });
    });

    function waitUpdateAfterAction(peer: Peer<any>, action: () => void) {
        return new Promise(async (resolve, reject) => {
            let description = peer.onUpdated.subscribe(() => {
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
            method: "POST",
            body: JSON.stringify(obj),
        })
    ).status;
}
