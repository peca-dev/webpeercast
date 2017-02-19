import * as Rx from "rxjs";
import { RemotePeer, RTCOfferData, RTCAnswerData, IceCandidateData } from "./remotepeer";

export default class RTCRemotePeer<T> implements RemotePeer<T> {
    onClosed = new Rx.Subject();
    onOfferRequesting = new Rx.Subject<string>(); // TODO: ピアによるハンドシェイク
    onOffering = new Rx.Subject<RTCOfferData>(); // TODO: ピアによるハンドシェイク
    onAnswering = new Rx.Subject<RTCAnswerData>(); // TODO: ピアによるハンドシェイク
    onIceCandidateEmitting = new Rx.Subject<IceCandidateData>(); // TODO: ピアによるハンドシェイク
    onBroadcasting = new Rx.Subject<T>();

    constructor(
        public readonly id: string,
        private peerConnection: RTCPeerConnection,
        private dataChannel: RTCDataChannel,
    ) {
        dataChannel.addEventListener("message", (e: MessageEvent) => {
            if (e.type !== "message") {
                throw new Error(`Unsupported message type: ${e.type}`);
            }
            let data = JSON.parse(e.data);
            if (data.type !== "broadcast") {
                throw new Error(`Unsupported data type: ${e.type}`);
            }
            this.onBroadcasting.next(data.payload);
        });
        dataChannel.addEventListener("error", (e: ErrorEvent) => {
            console.error(e);
        });
        dataChannel.addEventListener("close", (e: Event) => {
            this.onClosed.next();
            this.onClosed.complete();
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
