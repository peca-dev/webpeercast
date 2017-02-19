import * as Rx from "rxjs";
import { Upstream, RTCOfferData, RTCAnswerData, IceCandidateData } from "p2pcommunication-common";
import { printError, safe } from "./printerror";

export default class RemoteRootServer<T> implements Upstream<T> {
    readonly id = "";

    onClosed = new Rx.Subject();
    onOfferRequesting = new Rx.Subject<string>();
    onOfferingFromOther = new Rx.Subject<RTCOfferData>();
    onAnsweringFromOther = new Rx.Subject<RTCAnswerData>();
    onIceCandidateEmittingFromOther = new Rx.Subject<IceCandidateData>();
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
                    this.onOfferingFromOther.next(data.payload);
                    break;
                case "receiveRTCAnswer":
                    this.onAnsweringFromOther.next(data.payload);
                    break;
                case "receiveIceCandidate":
                    this.onIceCandidateEmittingFromOther.next(data.payload);
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

    send(obj: { type: string, payload: Object }) {
        this.socket.send(JSON.stringify(obj));
    }

    disconnect() {
        this.socket.close();
    }
}
