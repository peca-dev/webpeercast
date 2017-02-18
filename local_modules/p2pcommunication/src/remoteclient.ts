import * as Rx from "rxjs";
import { connection as WebSocketConnection } from "websocket";
import * as uuid from "uuid";
import * as declare from "../index";
import { getLogger } from "log4js";
const logger = getLogger();

export default class RemoteClient implements declare.RemoteClient {
    readonly id = uuid.v4();
    rtcOfferReceived = new Rx.Subject<any>();
    rtcAnswerReceived = new Rx.Subject<any>();
    iceCandidateReceived = new Rx.Subject<any>();
    broadcastReceived = new Rx.Subject<any>();
    closed = new Rx.Subject<any>();

    constructor(private connection: WebSocketConnection) {
        logger.debug("new peer", this.id);
        connection.send(JSON.stringify({
            type: "id",
            payload: this.id,
        }));
        connection.on("message", message => {
            try {
                switch (message.type) {
                    case "utf8":
                        logger.debug("Received Message: " + message.utf8Data);
                        let obj = JSON.parse(message.utf8Data!);
                        switch (obj.type) {
                            case "receiveRTCOffer":
                                this.rtcOfferReceived.next(obj.payload);
                                break;
                            case "receiveRTCAnswer":
                                this.rtcAnswerReceived.next(obj.payload);
                                break;
                            case "receiveIceCandidate":
                                this.iceCandidateReceived.next(obj.payload);
                                break;
                            case "broadcast":
                                this.broadcastReceived.next(obj.payload);
                                break;
                            default:
                                throw new Error("Unsupported data type: " + obj.type);
                        }
                        break;
                    case "binary":
                        logger.info("Received Binary Message of " + message.binaryData!.length + " bytes");
                        throw new Error("Unsupported data type.");
                    default:
                        throw new Error("Unsupported message type: " + message.type);
                }
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
        connection.on("close", (reasonCode, description) => {
            this.closed.next({ reasonCode, description });
            this.closed.complete();
        });
    }

    makeRTCOffer(to: string) {
        this.connection.send(JSON.stringify({
            type: "makeRTCOffer",
            payload: to,
        }));
    }

    receiveRTCOffer(from: string, offer: {}) {
        this.connection.send(JSON.stringify({
            type: "receiveRTCOffer",
            payload: {
                from,
                offer,
            },
        }));
    }

    receiveRTCAnswer(from: string, answer: {}) {
        this.connection.send(JSON.stringify({
            type: "receiveRTCAnswer",
            payload: {
                from,
                answer,
            },
        }));
    }

    receiveIceCandidate(from: string, iceCandidate: {}) {
        this.connection.send(JSON.stringify({
            type: "receiveIceCandidate",
            payload: {
                from,
                iceCandidate,
            },
        }));
    }

    broadcast(payload: any) {
        this.connection.send(JSON.stringify({
            type: "broadcast",
            payload,
        }));
    }
}
