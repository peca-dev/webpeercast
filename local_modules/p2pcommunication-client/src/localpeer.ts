import { EventEmitter } from "fbemitter";
import { printError, safe } from "./printerror";
import RemoteRootServer from "./remoterootserver";
import { createDataChannel, fetchDataChannel } from "./rtcconnector";
import { RemotePeer } from "./remotepeer";
import RTCRemotePeer from "./rtcremotepeer";

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
    private downstreams = new Set<RemotePeer>();

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
        for (let peer of Array.from(this.upstreams).concat(Array.from(this.otherStreams))) {
            peer.disconnect();
        }
    }

    broadcast(data: any) {
        broadcastTo(data, this.upstreams);
        broadcastTo(data, this.otherStreams);
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
                this.initUpstream(upstream);
                this.upstreams.add(upstream);
            } catch (e) {
                printError(e);
                setTimeout(
                    () => this.startConnectToServer(),
                    3 * 1000,
                );
            }
        })();
    }

    private initUpstream(upstream: RemotePeer) {
        upstream.addListener(
            "makeRTCOffer",
            safe(async (to: string) => {
                await this.makeRTCOffer(to, upstream);
            }),
        );
        type Data = { from: string, offer: RTCSessionDescriptionInit };
        upstream.addListener(
            "receiveRTCOffer",
            safe(async (data: Data) => {
                await this.receiveRTCOffer(data.from, data.offer, upstream);
            }),
        );
        upstream.addListener("close", safe(async () => {
            this.upstreams.delete(upstream);
            this.startConnectToServer();
        }));
        upstream.addListener("broadcast", (data: any) => {
            this.emit("broadcast", data);
            broadcastTo(data, this.otherStreams);
            broadcastTo(data, this.downstreams);
        });
    }

    private async makeRTCOffer(to: string, upstream: RemotePeer) {
        let peerConnection = new RTCPeerConnection();
        let dataChannel = await createDataChannel(
            peerConnection,
            to,
            upstream,
        );
        this.addNewOtherStream(to, peerConnection, dataChannel);
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
        this.addNewOtherStream(from, peerConnection, dataChannel);
    }

    private addNewOtherStream(
        id: string,
        peerConnection: RTCPeerConnection,
        dataChannel: RTCDataChannel,
    ) {
        let otherStream = new RTCRemotePeer(
            id,
            peerConnection,
            dataChannel,
        );
        otherStream.addListener("broadcast", (data: any) => {
            this.emit("broadcast", data);
            broadcastTo(data, this.downstreams);
        });
        this.otherStreams.add(otherStream);
    }
}

function broadcastTo(data: any, streams: Set<RemotePeer>) {
    for (let peer of streams) {
        peer.send({ type: "broadcast", payload: data });
    }
}
