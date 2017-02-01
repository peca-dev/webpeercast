/// <reference path="../../typings/index.d.ts" />
import * as assert from "power-assert";
import fetch from "node-fetch";
import Peer from "../peer";

const server = "localhost:8080";

// ルートサーバーから送った情報をピアで受け取ることができる
// Aから送った情報をBで受け取ることができる
// ... ここまではp2pcommunicationの機能

// ルートサーバーから送った情報を任意のタイミングでAから取得できる
// Bから送った情報を任意のタイミングでAから取得できる

describe("Peer", () => {
    describe("when data spawn from server", () => {
        let testData = [{ this: "this", is: "is", test: "test", data: 12345678 }];
        before(() => {
            postTestData(testData);
        });

        it("has all data", () => new Promise((resolve, reject) => {
            let peer = new Peer<typeof testData[0]>(`ws://${server}`);
            let describe = peer.addListener("update", () => {
                describe.remove();
                let data = peer.getAll();
                assert(data.length === testData.length);
                for (let i = 0; i < data.lentgth; i++) {
                    assert(data[i].this === testData[i].this);
                    assert(data[i].is === testData[i].is);
                    assert(data[i].test === testData[i].test);
                    assert(data[i].data === testData[i].data);
                }
                resolve();
            });
        }));
    });
});

async function postTestData(obj: any) {
    return (
        await fetch(`http://${server}`, {
            method: "POST",
            body: JSON.stringify(obj),
        })
    ).status;
}
