import * as assert from "power-assert";
import fetch from "node-fetch";
import { getLogger, BrowserConsoleAppender } from "log4javascript";
import YPPeer from "../yppeer";
const logger = getLogger();
logger.addAppender(new BrowserConsoleAppender());
const server = "localhost:8080";

describe("P2P", () => {
    it("connect between two peers", async () => {
        let a = new YPPeer(`ws://${server}`);
        let b = new YPPeer(`ws://${server}`);
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
            let peer: YPPeer;
            let otherPeers: YPPeer[];
            before(async () => {
                otherPeers = initPeers();
                await new Promise(
                    (resolve, reject) => setTimeout(resolve, 0.5 * 1000),
                );
                let serverStatus = await fetchServerStatus();
                assert(serverStatus.clients.length === 10);

                peer = new YPPeer(`ws://${server}`);
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
    let peers: YPPeer[] = [];
    for (let i = 0; i < 10; i++) {
        peers.push(new YPPeer(`ws://${server}`));
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
