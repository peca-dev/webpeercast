import * as Rx from "rxjs";
import { connection as WebSocketConnection } from "websocket";
import * as uuid from "uuid";
import { Downstream, OfferingData, AnsweringData, IceCandidateEmittingData } from "p2pcommunication-common";
import * as declaration from "../index";
import { getLogger } from "log4js";
const logger = getLogger();

export default class RemoteClient<T> implements declaration.RemoteClient<T>, Downstream<T> {
    readonly id = uuid.v4();

    onClosed = new Rx.Subject<{}>();
    onOffering = new Rx.Subject<OfferingData>();
    onAnswering = new Rx.Subject<AnsweringData>();
    onIceCandidateEmitting = new Rx.Subject<IceCandidateEmittingData>();
    onBroadcasting = new Rx.Subject<T>();

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
                                this.onOffering.next(obj.payload);
                                break;
                            case "receiveRTCAnswer":
                                this.onAnswering.next(obj.payload);
                                break;
                            case "receiveIceCandidate":
                                this.onIceCandidateEmitting.next(obj.payload);
                                break;
                            case "broadcast":
                                this.onBroadcasting.next(obj.payload);
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
            this.onClosed.next({ reasonCode, description });
            this.onClosed.complete();
        });
    }

    disconnect() {
        throw new Error("Not implemented.");
    }

    requestOfferTo(to: string) {
        this.connection.send(JSON.stringify({
            type: "makeRTCOffer",
            payload: to,
        }));
    }

    signalOffer(from: string, offer: {}) {
        this.connection.send(JSON.stringify({
            type: "receiveRTCOffer",
            payload: {
                from,
                offer,
            },
        }));
    }

    signalAnswer(from: string, answer: {}) {
        this.connection.send(JSON.stringify({
            type: "receiveRTCAnswer",
            payload: {
                from,
                answer,
            },
        }));
    }

    signalIceCandidate(from: string, iceCandidate: {}) {
        this.connection.send(JSON.stringify({
            type: "receiveIceCandidate",
            payload: {
                from,
                iceCandidate,
            },
        }));
    }

    broadcast(payload: T) {
        this.connection.send(JSON.stringify({
            type: "broadcast",
            payload,
        }));
    }
}
