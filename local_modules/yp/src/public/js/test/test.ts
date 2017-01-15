import * as assert from "power-assert";
import YPPeer from "../yppeer";
const url = "ws://localhost:8080/";

describe("It", () => {
    it("is so good!", () => new Promise((resolve, reject) => {
        assert(WebSocket != null);
        let socket = new WebSocket(url);
        socket.addEventListener("error", e => {
            reject(e);
        });
        socket.addEventListener("open", e => {
            socket.send("ping");
            socket.addEventListener("message", f => {
                assert(f.type === "message");
                assert(f.data === "pong");
                resolve();
            });
        });
    }));
});

describe("Layer connection", () => {
    describe("given a signaling server running and any peer standbying", () => {
        describe("when start module on level 1 layer", () => {
            describe("YPServer", () => {
                it("connect to a root server", () => {
                    let peer = new YPPeer(url);
                    peer.on
                });
                it("connect to any level 1 layer's peer", () => {

                });
                it("standby for connection from any level layer's peer", () => {

                });
            });
        });
    });
});
