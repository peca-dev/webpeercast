import * as assert from "power-assert";

declare const RTCPeerConnection: any;

describe("It", () => {
    it("is so good!", () => {
        assert(new RTCPeerConnection({}) != null);
    });
});
