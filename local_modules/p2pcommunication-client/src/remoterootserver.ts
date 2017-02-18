import { EventEmitter } from "fbemitter";
import { RemotePeer } from "./remotepeer";
import { printError, safe } from "./printerror";

export default class RemoteRootServer extends EventEmitter implements RemotePeer {
    readonly id = "";

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

        this.socket.addEventListener("message", safe(async (e: MessageEvent) => {
            let data = JSON.parse(e.data);
            this.emit(data.type, data.payload);
        }));
        this.socket.addEventListener("error", printError);
        this.socket.addEventListener("close", e => {
            this.emit("close");
        });
    }

    send(obj: { type: string, payload: Object }) {
        this.socket.send(JSON.stringify(obj));
    }

    disconnect() {
        this.socket.close();
    }
}
