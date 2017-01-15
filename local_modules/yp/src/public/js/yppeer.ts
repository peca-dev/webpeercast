import { getLogger } from "log4javascript";
const logger = getLogger();

export default class YPPeer {
    private socket: WebSocket;

    constructor(url: string) {
        this.connect();
    }

    private connect() {
        logger.info(`Connecting to: ${this.socket.url}`);
        this.socket = new WebSocket(this.socket.url);
        this.socket.addEventListener("error", e => {
            logger.error(e.error);
        });
        this.socket.addEventListener("open", e => {
            logger.info("Connected.");
            this.socket.addEventListener("message", f => {
                
            });
        });
        this.socket.addEventListener("close", e => {
            this.connect();
        });
    }
}
