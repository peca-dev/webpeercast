import { EventEmitter } from "fbemitter";
import { getLogger } from "log4javascript";
import RemoteRootServer from "./remoterootserver";
import RTCConnector from "./rtcconnector";
import { printError, safe } from "./printerror";
const logger = getLogger();

interface Connection {
    readonly id: string;
    readonly peerConnection: RTCPeerConnection;
    readonly dataChannel: RTCDataChannel;
}

/**
 * P2P ネットワークのローカルのピア
 * 同じコネクションを維持する必要がないので、接続が切れても再接続しない
 */
export default class YPPeer extends EventEmitter {
    id: string | null;
    private upstreams = new Set<RemoteRootServer>();
    private socket: WebSocket;
    private connectors = new Map<string, RTCConnector>();
    private connections = new Set<Connection>();

    debug = {
        hasPeer: (id: string | null) => {
            logger.debug(Array.from(this.connections));
            for (let conn of this.connections) {
                if (conn.id === id) {
                    return true;
                }
            }
            return false;
        },
    };

    constructor(url: string) {
        super();

        RemoteRootServer.fetch(url)
            .then(x => {
                this.upstreams.add(x);
                this.socket = x.socket;
                x.socket.addEventListener("message", safe(async (f: MessageEvent) => {
                    await this.receiveMessage(f);
                }));
            })
            .catch(e => {
                printError(logger, e);
            });
    }

    private async receiveMessage(e: MessageEvent) {
        let data = JSON.parse(e.data);
        switch (data.type) {
            case "id":
                logger.debug("id", data.payload);
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
        connector.addListener("channelopen", (dataChannel: RTCDataChannel) => {
            this.addConnection({ id: connector.id!, peerConnection: connector.conn, dataChannel });
        });
        this.connectors.set(to, connector);
        connector.makeOffer(to);
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
        connector.addListener("channelopen", (dataChannel: RTCDataChannel) => {
            this.addConnection({ id: connector.id!, peerConnection: connector.conn, dataChannel });
        });
        this.connectors.set(from, connector);
        return await connector.receiveOffer(from, sdInit);
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

    private addConnection(connection: Connection) {
        // RTCPeerConnection#connectionState は未実装
        if (/* connection.peerConnection.connectionState !== "connected" || */ connection.dataChannel.readyState !== "open") {
            logger.debug("addConnection failed.", connection.dataChannel.readyState);
            return false;
        }
        connection.peerConnection.addEventListener("connectionstatechange", () => {
            // if (connection.peerConnection.connectionState === "connected") {
            //     return;
            // }
            this.connections.delete(connection);
        });
        connection.dataChannel.addEventListener("close", () => {
            this.connections.delete(connection);
        });
        logger.debug("addConnection", connection.id);
        this.connections.add(connection);
        return true;
    }
}
