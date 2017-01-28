import { EventEmitter } from "fbemitter";
import { getLogger } from "log4javascript";
const logger = getLogger();

export default class RemoteRootServer extends EventEmitter {
    static async fetch(url: string) {
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
        this.socket.addEventListener("error", e => {
            try {
                logger.error(e.error);
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
        this.socket.addEventListener("close", e => {
            this.emit("close");
        });
    }
}
