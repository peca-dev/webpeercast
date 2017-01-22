import { getLogger } from "log4javascript";
import { EventEmitter } from "fbemitter";
import * as uuid from "uuid";
const logger = getLogger();

export default class YPPeer extends EventEmitter {
    readonly id = uuid.v4();
    private socket: WebSocket;
    private peers: YPPeer[] = []

    debug = ((self: YPPeer) => ({
        hasPeer(id: string) {
            return self.peers.some(x => x.id === id);
        },
    }))(this);

    constructor(url: string) {
        super();

        this.connect(url);
    }

    private connect(url: string) {
        logger.info(`Connecting to: ${url}`);
        this.socket = new WebSocket(url);
        this.socket.addEventListener("error", e => {
            logger.error(e.error);
        });
        this.socket.addEventListener("open", e => {
            logger.info("Connected.");
            this.socket.send(JSON.stringify({ name: "id", payload: this.id }));
            this.socket.addEventListener("message", f => {

            });
        });
        this.socket.addEventListener("close", e => {
            this.connect(url);
        });
    }
}
