import { EventEmitter } from "fbemitter";
import { RemotePeer } from "./remotepeer";

export default class RTCRemotePeer extends EventEmitter implements RemotePeer {
    constructor(
        public readonly id: string,
        private peerConnection: RTCPeerConnection,
        private dataChannel: RTCDataChannel
    ) {
        super();

        dataChannel.addEventListener("message", (e: MessageEvent) => {
            if (e.type !== "message") {
                throw new Error(`Unsupported message type: ${e.type}`);
            }
            let data = JSON.parse(e.data);
            if (data.type !== "broadcast") {
                throw new Error(`Unsupported data type: ${e.type}`);
            }
            this.emit("broadcast", data.payload);
        });
    }

    send(obj: { type: string, payload: Object }) {
        this.dataChannel.send(JSON.stringify(obj));
    }

    disconnect() {
        this.dataChannel.close();
        this.peerConnection.close();
    }
}
