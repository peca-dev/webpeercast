import { EventEmitter } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { printError, safe } from "./printerror";
const logger = getLogger(__filename);

export default class RemoteRootServer extends EventEmitter {
    static fetch(url: string) {
        return new Promise<{ id: string, upstream: RemoteRootServer }>((resolve, reject) => {
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
        super();

        this.socket.addEventListener("message", safe(logger, async (e: MessageEvent) => {
            let data = JSON.parse(e.data);
            switch (data.type) {
                case "makeRTCOffer":
                    if (data.payload == null) {
                        throw new Error("Payload is null.");
                    }
                    this.emit("makeRTCOffer", data.payload);
                    break;
                default:
                    throw new Error("Unsupported data type: " + data.type);
            }
        }));
        this.socket.addEventListener("error", e => printError(logger, e));
        this.socket.addEventListener("close", e => {
            this.emit("close");
        });
    }
}
