import * as Rx from "rxjs";
import {
    Upstream,
    SignalingOfferData,
    SignalingAnswerData,
    SignalingIceCandidateData,
} from "p2pcommunication-common";
import { printError, safe } from "./printerror";

export default class RemoteRootServer<T> implements Upstream<T> {
    readonly id = "";

    onClosed = new Rx.Subject();
    onOfferRequesting = new Rx.Subject<string>();
    onSignalingOffer = new Rx.Subject<SignalingOfferData>();
    onSignalingAnswer = new Rx.Subject<SignalingAnswerData>();
    onSignalingIceCandidate = new Rx.Subject<SignalingIceCandidateData>();
    onBroadcasting = new Rx.Subject<T>();

    static fetch<T>(url: string) {
        return new Promise<{ id: string, upstream: RemoteRootServer<T> }>((resolve, reject) => {
            let socket = new WebSocket(url);
            let timer = setTimeout(
                () => {
                    socket.onmessage = <any>null;
                    reject(new Error("Timeout."));
                },
                3 * 1000,
            );
            socket.onmessage = e => {
                let data = JSON.parse(e.data);
                switch (data.type) {
                    case "id":
                        clearTimeout(timer);
                        socket.onmessage = <any>null;
                        resolve({ id: data.payload, upstream: new RemoteRootServer(socket) });
                        break;
                    default:
                        throw new Error("Unsupported data type: " + data.type);
                }
            };
        });
    }

    constructor(public socket: WebSocket) {
        this.socket.addEventListener("message", safe(async (e: MessageEvent) => {
            let data = JSON.parse(e.data);
            switch (data.type) {
                case "makeRTCOffer":
                    this.onOfferRequesting.next(data.payload);
                    break;
                case "receiveRTCOffer":
                    this.onSignalingOffer.next(data.payload);
                    break;
                case "receiveRTCAnswer":
                    this.onSignalingAnswer.next(data.payload);
                    break;
                case "receiveIceCandidate":
                    this.onSignalingIceCandidate.next(data.payload);
                    break;
                case "broadcast":
                    this.onBroadcasting.next(data.payload);
                    break;
                default:
                    throw new Error(`Unsupported data type: ${data}`);
            }
        }));
        this.socket.addEventListener("error", printError);
        this.socket.addEventListener("close", e => {
            this.onClosed.next();
            this.onClosed.complete();
        });
    }

    offerTo(to: string, offer: RTCSessionDescriptionInit) {
        this.socket.send(JSON.stringify({
            type: "receiveRTCOffer",
            payload: { to, offer },
        }));
    }

    answerTo(to: string, answer: RTCSessionDescriptionInit) {
        this.socket.send(JSON.stringify({
            type: "receiveRTCAnswer",
            payload: { to, answer },
        }));
    }

    emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidate) {
        this.socket.send(JSON.stringify({
            type: "receiveIceCandidate",
            payload: { to, iceCandidate },
        }));    }

    broadcast(payload: T) {
        this.socket.send(JSON.stringify({ type: "broadcast", payload }));
    }

    disconnect() {
        this.socket.close();
    }
}
