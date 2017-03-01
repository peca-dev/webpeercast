import {
  Downstream,
  OfferRequestData,
  PeerType,
  RemotePeer,
  SignalingOfferData,
  Upstream,
} from 'p2pcommunication-common';
import * as Rx from 'rxjs';
import * as declaration from '../index';
import { printError, safe } from './printerror';
import RemoteRootServer from './RemoteRootServer';
import { createDataChannel, fetchDataChannel } from './rtcconnector';
import RTCRemotePeer from './RTCRemotePeer';

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
      for (const conn of this.otherStreams) {
        if (conn.id === id) {
          return true;
        }
      }
      return false;
    },
  };

  onConnected = new Rx.Subject<{ peerType: PeerType; remotePeer: RemotePeer<T> }>();
  onBroadcastReceived = new Rx.Subject<T>();

  constructor(url: string) {
    this.url = url;
    this.startConnectToServer();
  }

  disconnect() {
    this.url = null;
    for (const peer of Array.from(this.upstreams).concat(Array.from(this.otherStreams))) {
      peer.disconnect();
    }
  }

  broadcast(data: any) {
    broadcastTo(data, this.upstreams);
    broadcastTo(data, this.otherStreams);
    broadcastTo(data, this.downstreams);
  }

  private startConnectToServer() {
    if (this.url == null) {
      return;
    }
    const url = this.url;
    (async () => {
      try {
        this.id = null;
        const { id, upstream } = await RemoteRootServer.fetch<T>(url);
        this.id = id;
        this.addUpstream(upstream);
      } catch (e) {
        printError(e);
        setTimeout(
          () => this.startConnectToServer(),
          3 * 1000,
        );
      }
    })();
  }

  private async createNewConnection(
    to: string,
    peerType: PeerType,
    upstream: Upstream<T>,
  ) {
    const peerConnection = new RTCPeerConnection();
    const dataChannel = await createDataChannel(
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
    const peerConnection = new RTCPeerConnection();
    const dataChannel = await fetchDataChannel(
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
    const peer = new RTCRemotePeer<T>(
      id,
      peerConnection,
      dataChannel,
    );
    switch (peerType) {
      case 'upstream':
        this.addUpstream(peer);
        break;
      case 'otherStream':
        this.addNewOtherStream(peer);
        break;
      case 'downstream':
        this.addNewDownstream(peer);
        break;
      default:
        throw new Error(`Unsupported peerType: ${peerType}`);
    }
  }

  private addUpstream(upstream: Upstream<T>) {
    upstream.onOfferRequesting.subscribe(safe(async (data: OfferRequestData) => {
      await this.createNewConnection(data.to, data.peerType, upstream);
    }));
    upstream.onSignalingOffer.subscribe(safe(async (data: SignalingOfferData) => {
      await this.fetchNewOtherConnection(data.from, data.peerType, data.offer, upstream);
    }));
    upstream.onClosed.subscribe(safe(async () => {
      this.upstreams.delete(upstream);
      if (this.upstreams.size <= 0) {
        this.startConnectToServer();
      }
    }));
    upstream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastTo(data, this.downstreams);
    });
    this.upstreams.add(upstream);
    this.onConnected.next({ peerType: 'upstream', remotePeer: upstream });
  }

  private addNewOtherStream(otherStream: RemotePeer<T>) {
    otherStream.onClosed.subscribe(safe(async () => {
      this.otherStreams.delete(otherStream);
    }));
    otherStream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastTo(data, this.downstreams);
    });
    this.otherStreams.add(otherStream);
    this.onConnected.next({ peerType: 'otherStream', remotePeer: otherStream });
  }

  private addNewDownstream(downstream: Downstream<T>) {
    downstream.onClosed.subscribe(safe(async () => {
      this.downstreams.delete(downstream);
    }));
    downstream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastTo(data, this.upstreams);
      broadcastTo(data, this.otherStreams);
    });
    this.downstreams.add(downstream);
    this.onConnected.next({ peerType: 'downstream', remotePeer: downstream });
  }
}

function broadcastTo(data: any, streams: Set<RemotePeer<any>>) {
  for (const peer of streams) {
    peer.broadcast(data);
  }
}
