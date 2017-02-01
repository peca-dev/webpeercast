import { EventEmitter } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { printError, safe } from "./printerror";
import RemoteRootServer from "./remoterootserver";
import { createDataChannel, fetchDataChannel } from "./rtcconnector";
import { RemotePeer } from "./remotepeer";
import RTCRemotePeer from "./rtcremotepeer";
const logger = getLogger(__filename);

/**
 * It does nothing when it's disconnected with a downstream.
 * It connects to upstream when it's disconnected with a upstream.
 */
export default class LocalPeer extends EventEmitter {
    /** Decide by root server */
    id: string | null;
    private url: string | null;
    private upstreams = new Set<RemotePeer>();
    private otherStreams = new Set<RemotePeer>();

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

        this.url = url;
        this.startConnectToServer();
    }

    disconnect() {
        this.url = null;
        for (let peer of this.upstreams) {
            peer.disconnect();
        }
        for (let peer of this.otherStreams) {
            peer.disconnect();
        }
    }

    private startConnectToServer() {
        if (this.url == null) {
            return;
        }
        let url = this.url;
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
                    this.startConnectToServer();
                }));
                this.upstreams.add(upstream);
            } catch (e) {
                printError(logger, e);
                setTimeout(
                    () => this.startConnectToServer(),
                    3 * 1000,
                );
            }
        })();
    }

    private async makeRTCOffer(to: string, upstream: RemotePeer) {
        let peerConnection = new RTCPeerConnection();
        let dataChannel = await createDataChannel(
            peerConnection,
            to,
            upstream,
        );
        this.otherStreams.add(new RTCRemotePeer(
            to,
            peerConnection,
            dataChannel,
        ));
    }

    private async receiveRTCOffer(
        from: string,
        offer: RTCSessionDescriptionInit,
        upstream: RemotePeer,
    ) {
        let peerConnection = new RTCPeerConnection();
        let dataChannel = await fetchDataChannel(
            peerConnection,
            from,
            offer,
            upstream,
        );
        this.otherStreams.add(new RTCRemotePeer(
            from,
            peerConnection,
            dataChannel,
        ));
    }
}
