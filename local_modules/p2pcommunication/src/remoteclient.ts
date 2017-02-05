import { EventEmitter } from "events";
import { connection as WebSocketConnection } from "websocket";
import * as uuid from "uuid";
import * as declare from "../index";
import { getLogger } from "log4js";
const logger = getLogger();

export default class RemoteClient extends EventEmitter implements declare.RemoteClient {
    readonly id = uuid.v4();

    constructor(private connection: WebSocketConnection) {
        super();

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
                                this.emit("receiveRTCOffer", obj.payload);
                                break;
                            case "receiveRTCAnswer":
                                this.emit("receiveRTCAnswer", obj.payload);
                                break;
                            case "receiveIceCandidate":
                                this.emit("receiveIceCandidate", obj.payload);
                                break;
                            case "broadcast":
                                this.emit("broadcast", obj.payload);
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
            this.emit("close", reasonCode, description);
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
