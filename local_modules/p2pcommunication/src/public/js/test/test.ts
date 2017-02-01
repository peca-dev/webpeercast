import * as assert from "power-assert";
import fetch from "node-fetch";
import LocalPeer from "../localpeer";
const server = "localhost:8080";
const log4js2 = require("log4js2");
log4js2.configure({ loggers: [{ logLevel: log4js2.LogLevel.DEBUG }] });

describe("Connection", () => {
    context("between two peers", () => {
        let a: LocalPeer;
        let b: LocalPeer;

        before(() => {
            a = new LocalPeer(`ws://${server}`);
            b = new LocalPeer(`ws://${server}`);
        });

        it("connects to server", async () => {
            await new Promise(
                (resolve, reject) => setTimeout(resolve, 1 * 1000),
            );
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 2);
            assert(a.debug.hasPeer(b.id));
            assert(b.debug.hasPeer(a.id));
        });

        after(async () => {
            a.disconnect();
            b.disconnect();
            let serverStatus = await fetchServerStatus();
            assert(serverStatus.clients.length === 0);
        });
    });
});

describe("Sharing", () => {
    it("between two peers is made", async () => {
        let a = new LocalPeer(`ws://${server}`);
        let b = new LocalPeer(`ws://${server}`);
        await new Promise(
            (resolve, reject) => setTimeout(resolve, 1 * 1000),
        );
        let serverStatus = await fetchServerStatus();
        assert(serverStatus.clients.length === 2);
        assert(a.debug.hasPeer(b.id));
        assert(b.debug.hasPeer(a.id));
    });
});

xdescribe("Layer connection", () => {
    describe("When given a signaling server running and any peer standbying,", () => {
        describe("peer on level 1 layer", () => {
            let peer: LocalPeer;
            let otherPeers: LocalPeer[];
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
    let peers: LocalPeer[] = [];
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
