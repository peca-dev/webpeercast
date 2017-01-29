import { EventEmitter } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { printError, safe } from "./printerror";
import RemoteRootServer from "./remoterootserver";
import { createDataChannel, fetchDataChannel } from "./rtcconnector";
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
                    this.connections.add({
                        id: to,
                        peerConnection,
                        dataChannel,
                    });
                }));
                x.upstream.addListener(
                    "receiveRTCOffer",
                    safe(logger, async (data: { from: string, offer: RTCSessionDescriptionInit }) => {
                        logger.debug("receiveRTCOffer", data);
                        let peerConnection = new RTCPeerConnection();
                        let dataChannel = await fetchDataChannel(peerConnection, data.from, data.offer, x.upstream);
                        this.connections.add({ id: data.from, peerConnection, dataChannel });
                    })
                );
                x.upstream.addListener("message", safe(logger, async (data: any) => {
                    // await this.receiveMessage(data);
                }));
            })
            .catch(e => {
                printError(logger, e);
            });
    }
}
