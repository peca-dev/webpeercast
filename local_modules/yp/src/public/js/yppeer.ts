import { EventEmitter } from "fbemitter";
import RTCConnector from "./rtcconnector";
import { getLogger } from "log4javascript";
const logger = getLogger();

interface Connection {
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;
}

export default class YPPeer extends EventEmitter {
    id: string | null;
    private socket: WebSocket;
    private peers: YPPeer[] = []
    private connectors = new Map<string, RTCConnector>();
    private connections = new Set<Connection>();

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
            try {
                logger.error(e.error);
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
        this.socket.addEventListener("open", e => {
            try {
                logger.info("Connected.");
                this.socket.addEventListener("message", async f => {
                    try {
                        await this.receiveMessage(f);
                    } catch (e) {
                        logger.error((e.toString != null ? e.toString() : "") + "\n" + e.stack || e.name || e);
                    }
                });
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
        this.socket.addEventListener("close", e => {
            try {
                this.connect(url);
            } catch (e) {
                logger.error(e.stack || e);
            }
        });
    }

    private async receiveMessage(e: MessageEvent) {
        let data = JSON.parse(e.data);
        switch (data.type) {
            case "id":
                this.id = data.payload;
                break;
            case "makeRTCOffer":
                let to = data.payload;
                if (to == null) {
                    throw new Error("Payload is null.");
                }
                this.makeRTCOffer(to);
                break;
            case "receiveRTCOffer":
                let answer = await this.receiveRTCOffer(
                    data.payload.from,
                    data.payload.offer,
                );
                logger.debug("send receiveAnswer");
                this.socket.send(JSON.stringify({
                    type: "receiveRTCAnswer",
                    payload: {
                        to: data.payload.from,
                        answer,
                    },
                }));
                break;
            case "receiveRTCAnswer":
                logger.debug("receiveRTCAnswer");
                await this.receiveRTCAnswer(
                    data.payload.from,
                    data.payload.answer,
                );
                break;
            case "receiveIceCandidate":
                logger.debug("receiveIceCandidate");
                await this.receiveIceCandidate(
                    data.payload.from,
                    data.payload.iceCandidate,
                );
                break;
            default:
                throw new Error("Unsupported data type: " + data.type);
        }
    }

    private makeRTCOffer(to: string) {
        let connector = new RTCConnector();
        connector.addListener("timeout", () => {
            this.connectors.delete(to);
        });
        connector.addListener("offer", (offer: RTCSessionDescription) => {
            this.socket.send(JSON.stringify({
                type: "receiveRTCOffer",
                payload: { to, offer },
            }));
        });
        connector.addListener("icecandidate", (iceCandidate: RTCIceCandidate) => {
            if (iceCandidate == null) {
                throw new Error();
            }
            this.socket.send(JSON.stringify({
                type: "receiveIceCandidate",
                payload: { to, iceCandidate },
            }));
        });
        this.connectors.set(to, connector);
        connector.makeOffer();
    }

    private async receiveRTCOffer(from: string, sdInit: RTCSessionDescriptionInit) {
        let connector = new RTCConnector();
        connector.addListener("timeout", () => {
            this.connectors.delete(from);
        });
        connector.addListener("icecandidate", (iceCandidate: RTCIceCandidate) => {
            if (iceCandidate == null) {
                throw new Error();
            }
            this.socket.send(JSON.stringify({
                type: "receiveIceCandidate",
                payload: { to: from, iceCandidate },
            }));
        });
        this.connectors.set(from, connector);
        return await connector.receiveOffer(sdInit);
    }

    private async receiveRTCAnswer(id: string, sdInit: RTCSessionDescriptionInit) {
        let connector = this.connectors.get(id);
        if (connector == null) {
            return;
        }
        await connector.receiveAnswer(sdInit);
        logger.debug("negotiation completed");
    }

    private async receiveIceCandidate(id: string, candidate: RTCIceCandidateInit) {
        let connector = this.connectors.get(id);
        if (connector == null) {
            return;
        }
        logger.debug("receiveIceCandidate", connector.receiveIceCandidate);
        await connector.receiveIceCandidate(candidate);
        logger.debug("receiveIceCandidate", "done");
    }
}
