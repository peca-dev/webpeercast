import { EventEmitter } from "events";
import { connection as WebSocketConnection } from "websocket";
import { getLogger } from "log4js";
const logger = getLogger();

export default class YPClient extends EventEmitter {
    id: string;

    on(event: "close", cb: (code: number, desc: string) => void): this;
    on(event: string | symbol, listener: Function): this {
        return super.on(event, listener);
    }

    constructor(connection: WebSocketConnection) {
        super();

        connection.on("message", message => {
            try {
                switch (message.type) {
                    case "utf8":
                        logger.debug("Received Message: " + message.utf8Data);
                        let obj = JSON.parse(message.utf8Data!);
                        switch (obj.name) {
                            case "id":
                                this.id = obj.payload;
                                break;
                            default:
                                throw new Error("Unsupported data type: " + obj.name);
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
}
