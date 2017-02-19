import * as Rx from "rxjs";
import {
    OfferRequestData,
    PeerType,
    RemotePeer,
    Upstream,
    SignalingOfferData,
} from "p2pcommunication-common";
import * as declaration from "../index";
import { printError, safe } from "./printerror";
import RemoteRootServer from "./remoterootserver";
import { createDataChannel, fetchDataChannel } from "./rtcconnector";
import RTCRemotePeer from "./rtcremotepeer";

/**
 * It does nothing when it's disconnected with a downstream.
 * It connects to upstream when it's disconnected with a upstream.
 */
export default class LocalPeer<T> implements declaration.LocalPeer<T> {
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

    onBroadcastReceived = new Rx.Subject<T>();

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

    private initUpstream(upstream: Upstream<T>) {
        upstream.onOfferRequesting.subscribe(safe(async (data: OfferRequestData) => {
            await this.createNewConnection(data.to, data.peerType, upstream);
        }));
        upstream.onSignalingOffer.subscribe(safe(async (data: SignalingOfferData) => {
            await this.fetchNewOtherConnection(data.from, data.peerType, data.offer, upstream);
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

    private async createNewConnection(
        to: string,
        peerType: PeerType,
        upstream: Upstream<T>,
    ) {
        let peerConnection = new RTCPeerConnection();
        let dataChannel = await createDataChannel(
            peerConnection,
            to,
            upstream,
        );
        this.addNewConnection(to, peerConnection, dataChannel, peerType);
    }

    private async fetchNewOtherConnection(
        from: string,
        peerType: PeerType,
        offer: RTCSessionDescriptionInit,
        upstream: Upstream<T>,
    ) {
        let peerConnection = new RTCPeerConnection();
        let dataChannel = await fetchDataChannel(
            peerConnection,
            from,
            offer,
            upstream,
        );
        this.addNewConnection(from, peerConnection, dataChannel, peerType);
    }

    private addNewConnection(
        id: string,
        peerConnection: RTCPeerConnection,
        dataChannel: RTCDataChannel,
        peerType: PeerType,
    ) {
        switch (peerType) {
            case "upstream":
                throw new Error("Not implemented");
            case "otherStream":
                this.addNewOtherStream(id, peerConnection, dataChannel);
            case "downstream":
                throw new Error("Not implemented");
            default:
                throw new Error(`Unsupported peerType: ${peerType}`);
        }
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
        peer.broadcast(data);
    }
}
