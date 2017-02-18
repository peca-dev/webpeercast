import * as Rx from "rxjs";
import * as declaration from "../index";
import { printError, safe } from "./printerror";
import RemoteRootServer from "./remoterootserver";
import { createDataChannel, fetchDataChannel } from "./rtcconnector";
import { RemotePeer, RTCOfferData } from "./remotepeer";
import RTCRemotePeer from "./rtcremotepeer";

/**
 * It does nothing when it's disconnected with a downstream.
 * It connects to upstream when it's disconnected with a upstream.
 */
export default class LocalPeer<T> implements declaration.LocalPeer<T> {
    onBroadcastReceived = new Rx.Subject<T>();

    /** Decide by root server */
    id: string | null;
    private url: string | null;
    private upstreams = new Set<RemotePeer<T>>();
    private otherStreams = new Set<RemotePeer<T>>();
    private downstreams = new Set<RemotePeer<T>>();

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
                let { id, upstream } = await RemoteRootServer.fetch<T>(url);
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

    private initUpstream(upstream: RemotePeer<T>) {
        upstream.onMakeRTCOfferRequesting.subscribe(safe(async (to: string) => {
            await this.makeRTCOffer(to, upstream);
        }));
        upstream.onRTCOffering.subscribe(safe(async (data: RTCOfferData) => {
            await this.receiveRTCOffer(data.from, data.offer, upstream);
        }));
        upstream.onClosed.subscribe(safe(async () => {
            this.upstreams.delete(upstream);
            this.startConnectToServer();
        }));
        upstream.onBroadcasting.subscribe(data => {
            this.onBroadcastReceived.next(data);
            broadcastTo(data, this.otherStreams);
            broadcastTo(data, this.downstreams);
        });
    }

    private async makeRTCOffer(to: string, upstream: RemotePeer<T>) {
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
        upstream: RemotePeer<T>,
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
        let otherStream = new RTCRemotePeer<T>(
            id,
            peerConnection,
            dataChannel,
        );
        otherStream.onBroadcasting.subscribe(data => {
            this.onBroadcastReceived.next(data);
            broadcastTo(data, this.downstreams);
        });
        this.otherStreams.add(otherStream);
    }
}

function broadcastTo(data: any, streams: Set<RemotePeer<any>>) {
    for (let peer of streams) {
        peer.send({ type: "broadcast", payload: data });
    }
}
