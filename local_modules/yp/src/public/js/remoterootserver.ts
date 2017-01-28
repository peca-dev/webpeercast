import { EventEmitter } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { printError } from "./printerror";
const logger = getLogger(__filename);

export default class RemoteRootServer extends EventEmitter {
    static fetch(url: string) {
        return new Promise<RemoteRootServer>((resolve, reject) => {
            let socket = new WebSocket(url);
            let timer = setTimeout(
                () => {
                    socket.onopen = <any>null;
                    reject(new Error("Timeout."));
                },
                3 * 1000,
            );
            socket.onopen = e => {
                clearTimeout(timer);
                socket.onopen = <any>null;
                resolve(new RemoteRootServer(socket));
            };
        });
    }

    constructor(public socket: WebSocket) {
        super();

        // this.socket.addEventListener("message", async f => {
        //     try {
        //         await this.receiveMessage(f);
        //     } catch (e) {
        //         logger.error((e.toString != null ? e.toString() : "") + "\n" + e.stack || e.name || e);
        //     }
        // });
        this.socket.addEventListener("error", e => printError(logger, e));
        this.socket.addEventListener("close", e => {
            this.emit("close");
        });
    }
}
