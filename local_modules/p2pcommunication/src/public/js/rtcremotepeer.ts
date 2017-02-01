import { RemotePeer } from "./remotepeer";

export default class RTCRemotePeer implements RemotePeer {
    constructor(
        public id: string,
        public peerConnection: RTCPeerConnection,
        public dataChannel: RTCDataChannel) {
    }

    send(obj: { type: string, payload: Object }) {
        throw new Error("Not implemented.");
    }

    addListener(
        eventType: string,
        listener: (payload: any) => void,
        context?: any,
    ): EventSubscription {
        throw new Error("Not implemented.");
    }

    disconnect() {
        this.dataChannel.close();
        this.peerConnection.close();
    }
}
