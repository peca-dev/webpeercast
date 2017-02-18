/// <reference path="../../typings/index.d.ts" />
import * as assert from "power-assert";
import LocalPeer from "../localpeer";
const server = "127.0.0.1:8080";

describe("Connection", () => {
    context("between two peers", () => {
        let a: LocalPeer<{}>;
        let b: LocalPeer<{}>;

        before(async () => {
            a = new LocalPeer(`ws://${server}`);
            b = new LocalPeer(`ws://${server}`);
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 1 * 1000),
            );
        });

        it("connects to server", async () => {
            let serverStatus = await fetchServerStatus();
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
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 0);
        });
    });

    context("between many peers on one layer", function (this: any) {
        // tslint:disable-next-line:no-invalid-this
        this.timeout(5 * 1000);
        let a = <Array<LocalPeer<{}>>>[];

        before(async () => {
            for (let i = 0; i < 10; i++) {
                a.push(new LocalPeer(`ws://${server}`));
            }
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 3 * 1000),
            );
        });

        it("connects to server", async () => {
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === a.length);
            assert(a.every(
                x => a
                    .filter(y => y.id !== x.id)
                    .every(y => y.debug.hasPeer(x.id)),
            ));
        });

        after(async () => {
            for (let x of a) {
                x.disconnect();
            }
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 1 * 1000),
            );
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 0);
        });
    });
});

describe("Sharing", () => {
    context("between two peers", () => {
        let a: LocalPeer<string>;
        let b: LocalPeer<string>;

        before(async () => {
            a = new LocalPeer(`ws://${server}`);
            b = new LocalPeer(`ws://${server}`);
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 1 * 1000),
            );
        });

        it("with one message does", async () => {
            let messageDataA = "message-data-a";
            let receiveA = await new Promise<string>(resolve => {
                let subscription = b.onBroadcastReceived.subscribe(data => {
                    subscription.unsubscribe();
                    resolve(data);
                });
                a.broadcast(messageDataA);
            });
            assert(receiveA === messageDataA);
            let messageDataB = "message-data-b";
            let receiveB = await new Promise<string>(resolve => {
                let subscription = a.onBroadcastReceived.subscribe(data => {
                    subscription.unsubscribe();
                    resolve(data);
                });
                b.broadcast(messageDataB);
            });
            assert(receiveB === messageDataB);
        });
    });

    context("between many peers on one layer", function (this: any) {
        // tslint:disable-next-line:no-invalid-this
        this.timeout(5 * 1000);

        let peers = <Array<LocalPeer<{}>>>[];

        before(async () => {
            for (let i = 0; i < 10; i++) {
                peers.push(new LocalPeer(`ws://${server}`));
            }
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 3 * 1000),
            );
        });

        it("with one message is received 9 messages", async () => {
            let count = 0;
            for (let i = 1; i < 10; i++) {
                peers[i].onBroadcastReceived.subscribe(data => {
                    count++;
                });
            }
            peers[0].broadcast("data");
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 1 * 1000),
            );
            assert(count === 9);
        });
    });
});

xdescribe("Layer connection", () => {
    describe("When given a signaling server running and any peer standbying,", () => {
        describe("peer on level 1 layer", () => {
            let peer: LocalPeer<{}>;
            let otherPeers: Array<LocalPeer<{}>>;
            before(async () => {
                otherPeers = initPeers();
                await new Promise(
                    (resolve, reject) => setTimeout(resolve, 0.5 * 1000),
                );
                let serverStatus = await fetchServerStatus();
                assert(serverStatus.clients.length === 10);

                peer = new LocalPeer(`ws://${server}`);
            });
            it("connect to a root server", async () => {
                let serverStatus = await fetchServerStatus();
                assert(
                    serverStatus.clients
                        .map((x: any) => x.id)
                        .some((x: string) => x === peer.id),
                );
            });
            it("connect to any level 1 layer's peer", () => {
                assert(otherPeers.some(x => x.debug.hasPeer(peer.id)));
            });
            it("standby for connection from any level layer's peer", () => {
                assert(false);
            });
        });
    });
});

function initPeers() {
    let peers: Array<LocalPeer<{}>> = [];
    for (let i = 0; i < 10; i++) {
        peers.push(new LocalPeer(`ws://${server}`));
    }
    // for (let i = 0; i < 10; i++) {
    //     layer2Peers.push(new YPPeer(`ws://${server}`));
    // }
    // for (let i = 0; i < 10; i++) {
    //     layer3Peers.push(new YPPeer(`ws://${server}`));
    // }
    return peers;
}

async function fetchServerStatus() {
    return JSON.parse(await (await fetch(`http://${server}`)).text());
}
