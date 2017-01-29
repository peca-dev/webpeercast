import { EventEmitter } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { printError, safe } from "./printerror";
import RemoteRootServer from "./remoterootserver";
import { createDataChannel, fetchDataChannel } from "./rtcconnector";
import { Upstream } from "./upstream";
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
    /** ルートサーバーが決定するid */
    id: string | null;
    private upstreams = new Set<Upstream>();
    private otherStreams = new Set<Connection>();

    debug = {
        hasPeer: (id: string | null) => {
            for (let conn of this.otherStreams) {
                if (conn.id === id) {
                    return true;
                }
            }
            return false;
        },
    };

    constructor(url: string) {
        super();

        this.startConnectToServer(url);
    }

    private startConnectToServer(url: string) {
        (async () => {
            try {
                this.id = null;
                let { id, upstream } = await RemoteRootServer.fetch(url);
                this.id = id;
                upstream.addListener(
                    "makeRTCOffer",
                    safe(logger, async (to: string) => {
                        await this.makeRTCOffer(to, upstream);
                    }),
                );
                type Data = { from: string, offer: RTCSessionDescriptionInit };
                upstream.addListener(
                    "receiveRTCOffer",
                    safe(logger, async (data: Data) => {
                        await this.receiveRTCOffer(data.from, data.offer, upstream);
                    }),
                );
                upstream.addListener("close", safe(logger, async () => {
                    this.upstreams.delete(upstream);
                    this.startConnectToServer(url);
                }));
                this.upstreams.add(upstream);
            } catch (e) {
                printError(logger, e);
                setTimeout(
                    () => this.startConnectToServer(url),
                    3 * 1000,
                );
            }
        })();
    }

    private async makeRTCOffer(to: string, upstream: Upstream) {
        let peerConnection = new RTCPeerConnection();
        let dataChannel = await createDataChannel(
            peerConnection,
            to,
            upstream,
        );
        this.otherStreams.add({
            id: to,
            peerConnection,
            dataChannel,
        });
    }

    private async receiveRTCOffer(
        from: string,
        offer: RTCSessionDescriptionInit,
        upstream: Upstream,
    ) {
        let peerConnection = new RTCPeerConnection();
        let dataChannel = await fetchDataChannel(
            peerConnection,
            from,
            offer,
            upstream,
        );
        this.otherStreams.add({
            id: from,
            peerConnection,
            dataChannel,
        });
    }
}
