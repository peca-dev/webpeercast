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
            await new Promise((resolve, reject) => {
                let count = 2;
                let countDown = () => {
                    count -= 1;
                    if (count === 0) {
                        resolve();
                    }
                };
                waitOtherPeer(a, countDown);
                waitOtherPeer(b, countDown);
            });
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 2);
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
        let peers = <Array<LocalPeer<{}>>>[];

        before(async () => {
            for (let i = 0; i < 10; i++) {
                peers.push(new LocalPeer(`ws://${server}`));
            }
            await new Promise((resolve, reject) => {
                let count = peers.length;
                let countDown = () => {
                    count -= 1;
                    if (count === 0) {
                        resolve();
                    }
                };
                for (let peer of peers) {
                    waitOtherPeer(peer, countDown);
                }
            });
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 10);
        });

        it("connects to server", async () => {
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === peers.length);
            assert(peers.every(
                x => peers
                    .filter(y => y.id !== x.id)
                    .every(y => y.debug.hasPeer(x.id)),
            ));
        });

        after(async () => {
            for (let x of peers) {
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
            await new Promise((resolve, reject) => {
                let count = 2;
                let countDown = () => {
                    count -= 1;
                    if (count === 0) {
                        resolve();
                    }
                };
                waitOtherPeer(a, countDown);
                waitOtherPeer(b, countDown);
            });
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 2);
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

    context("between many peers", function (this: any) {
        // tslint:disable-next-line:no-invalid-this
        this.timeout(5 * 1000);
        const PEERS_COUNT = 15;

        let peers = <Array<LocalPeer<{}>>>[];

        before(async () => {
            let count = PEERS_COUNT;
            let callback: Function;
            let countDown = () => {
                count -= 1;
                if (count === 0) {
                    callback();
                }
            };
            for (let i = 0; i < PEERS_COUNT; i++) {
                let peer = new LocalPeer(`ws://${server}`);
                waitOtherPeer(peer, countDown);
                peers.push(peer);
            }
            await new Promise((resolve, reject) => {
                callback = resolve;
            });
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length >= 10);
        });

        for (let i = 0; i < PEERS_COUNT; i++) {
            it(`receive message from peer[${i}]`, ((testIndex: number) => async () => {
                assert(peers.length === PEERS_COUNT);
                let testPeer = peers[testIndex];
                let promises = Promise.all(peers.filter(x => x !== testPeer).map(x => new Promise((resolve, reject) => {
                    let subscriber = x.onBroadcastReceived.subscribe(() => {
                        subscriber.unsubscribe();
                        resolve();
                    });
                })));
                testPeer.broadcast("ping");
                await promises;
            })(i));
        }

        after(async () => {
            for (let x of peers) {
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

function waitOtherPeer<T>(peer: LocalPeer<T>, callback: () => void) {
    let subscriber = peer.onConnected.subscribe(obj => {
        if (obj.peerType === "upstream"
            && obj.remotePeer.id === "00000000-0000-0000-0000-000000000000") {
            return;
        }
        subscriber.unsubscribe();
        callback();
    });
}
