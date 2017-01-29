import { EventEmitter } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { printError, safe } from "./printerror";
import RemoteRootServer from "./remoterootserver";
import RTCConnector, { createDataChannel, fetchDataChannel } from "./rtcconnector";
const logger = getLogger(__filename);

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
    private connectors = new Map<string, RTCConnector>();
    private connections = new Set<Connection>();

    debug = {
        hasPeer: (id: string | null) => {
            logger.debug(Array.from(this.connections).toString());
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
                this.id = x.id;
                this.upstreams.add(x.upstream);
                x.upstream.addListener("makeRTCOffer", safe(logger, async (to: string) => {
                    logger.debug("makeRTCOffer", to);
                    let peerConnection = new RTCPeerConnection();
                    let dataChannel = await createDataChannel(peerConnection, to, x.upstream);
                    this.connections.add({ id: to, peerConnection, dataChannel });
                }));
                x.upstream.addListener("receiveRTCOffer", safe(logger, async (data: { from: string, offer: RTCSessionDescriptionInit }) => {
                    logger.debug("receiveRTCOffer", data);
                    let peerConnection = new RTCPeerConnection();
                    let dataChannel = await fetchDataChannel(peerConnection, data.from, data.offer, x.upstream);
                    this.connections.add({ id: data.from, peerConnection, dataChannel });
                }));
                x.upstream.addListener("message", safe(logger, async (data: any) => {
                    // await this.receiveMessage(data);
                }));
            })
            .catch(e => {
                printError(logger, e);
            });
    }

    private async receiveMessage(data: any) {
        switch (data.type) {
            case "receiveRTCOffer":
                let answer = await this.receiveRTCOffer(
                    data.payload.from,
                    data.payload.offer,
                );
                logger.debug("send receiveAnswer");
                Array.from(this.upstreams)[0].send({
                    type: "receiveRTCAnswer",
                    payload: {
                        to: data.payload.from,
                        answer,
                    },
                });
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

    private async makeRTCOffer(to: string) {
        // let connector = new RTCConnector();
        // connector.addListener("timeout", () => {
        //     this.connectors.delete(to);
        // });
        // connector.addListener("offer", (offer: RTCSessionDescription) => {
        //     Array.from(this.upstreams)[0].send({
        //         type: "receiveRTCOffer",
        //         payload: { to, offer },
        //     });
        // });
        // connector.addListener("icecandidate", (iceCandidate: RTCIceCandidate) => {
        //     if (iceCandidate == null) {
        //         throw new Error();
        //     }
        //     Array.from(this.upstreams)[0].send({
        //         type: "receiveIceCandidate",
        //         payload: { to, iceCandidate },
        //     });
        // });
        // connector.addListener("channelopen", (dataChannel: RTCDataChannel) => {
        //     this.addConnection({ id: connector.id!, peerConnection: connector.conn, dataChannel });
        // });
        // this.connectors.set(to, connector);
        // connector.makeOffer(to);
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
            Array.from(this.upstreams)[0].send({
                type: "receiveIceCandidate",
                payload: { to: from, iceCandidate },
            });
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
