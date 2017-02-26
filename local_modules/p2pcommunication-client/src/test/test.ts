// tslint:disable-next-line:no-reference
/// <reference path="../../typings/index.d.ts" />
import * as assert from 'power-assert';
import LocalPeer from '../LocalPeer';
const server = '127.0.0.1:8080';

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
                (resolve, reject) => setTimeout(resolve, 1 * 1000)
            );
            const serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 0);
        });
    });

    context('between many peers on one layer', () => {
        const peers = <LocalPeer<{}>[]>[];

        before(function () {
            // tslint:disable-next-line:no-invalid-this
            this.timeout(5 * 1000);
        });
        before(async () => {
            for (let i = 0; i < 10; i++) {
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
                    .every(y => y.debug.hasPeer(x.id))
            ));
        });

        after(async () => {
            for (const x of peers) {
                x.disconnect();
            }
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 1 * 1000)
            );
            const serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 0);
        });
    });
});

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
            const receiveA = await new Promise<string>(resolve => {
                const subscription = b.onBroadcastReceived.subscribe(data => {
                    subscription.unsubscribe();
                    resolve(data);
                });
                a.broadcast(messageDataA);
            });
            assert(receiveA === messageDataA);
            const messageDataB = 'message-data-b';
            const receiveB = await new Promise<string>(resolve => {
                const subscription = a.onBroadcastReceived.subscribe(data => {
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
                (resolve, reject) => setTimeout(resolve, 1 * 1000)
            );
            const serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 0);
        });
    });

    context('between many peers', () => {
        const PEERS_COUNT = 15;

        const peers = <LocalPeer<{}>[]>[];

        before(function () {
            // tslint:disable-next-line:no-invalid-this
            this.timeout(5 * 1000);
        });
        before(async () => {
            let count = PEERS_COUNT;
            let callback: Function;
            const countDown = () => {
                count -= 1;
                if (count === 0) {
                    callback();
                }
            };
            for (let i = 0; i < PEERS_COUNT; i++) {
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

        for (let i = 0; i < PEERS_COUNT; i++) {
            it(`receive message from peer[${i}]`, ((testIndex: number) => async () => {
                assert(peers.length === PEERS_COUNT);
                const testPeer = peers[testIndex];
                const promises = Promise.all(peers.filter(x => x !== testPeer).map(x => new Promise((resolve, reject) => {
                    const subscriber = x.onBroadcastReceived.subscribe(() => {
                        subscriber.unsubscribe();
                        resolve();
                    });
                })));
                testPeer.broadcast('ping');
                await promises;
            })(i));
        }

        after(async () => {
            for (const x of peers) {
                x.disconnect();
            }
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 1 * 1000)
            );
            const serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 0);
        });
    });
});

xdescribe('Layer connection', () => {
    describe('When given a signaling server running and any peer standbying,', () => {
        describe('peer on level 1 layer', () => {
            let peer: LocalPeer<{}>;
            let otherPeers: LocalPeer<{}>[];
            before(async () => {
                otherPeers = initPeers();
                await new Promise(
                    (resolve, reject) => setTimeout(resolve, 0.5 * 1000)
                );
                const serverStatus = await fetchServerStatus();
                assert(serverStatus.clients.length === 10);

                peer = new LocalPeer(`ws://${server}`);
            });
            it('connect to a root server', async () => {
                const serverStatus = await fetchServerStatus();
                assert(
                    serverStatus.clients
                        .map((x: any) => x.id)
                        .some((x: string) => x === peer.id)
                );
            });
            it('connect to any level 1 layer\'s peer', () => {
                assert(otherPeers.some(x => x.debug.hasPeer(peer.id)));
            });
            it('standby for connection from any level layer\'s peer', () => {
                assert(false);
            });
        });
    });
});

function initPeers() {
    const peers: LocalPeer<{}>[] = [];
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
    const subscriber = peer.onConnected.subscribe(obj => {
        if (obj.peerType === 'upstream'
            && obj.remotePeer.id === '00000000-0000-0000-0000-000000000000') {
            return;
        }
        subscriber.unsubscribe();
        callback();
    });
}
