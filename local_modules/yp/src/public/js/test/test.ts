import * as assert from "power-assert";
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
