import * as assert from "power-assert";
import fetch from "node-fetch";
import YPPeer from "../yppeer";
const server = "localhost:8080";

describe("Layer connection", () => {
    describe("When given a signaling server running and any peer standbying,", () => {
        describe("peer on level 1 layer", () => {
            let peer: YPPeer;
            let otherPeers: YPPeer[];
            before(async () => {
                otherPeers = initPeers();
                await new Promise(
                    (resolve, reject) => setTimeout(resolve, 1 * 1000),
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
    let json = await (await fetch(`http://${server}`)).text();
    console.log(json);
    return JSON.parse(json);
}