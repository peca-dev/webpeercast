import {
  Downstream,
  LocalPeer,
  OfferRequestData,
  PeerType,
  provideConnection,
  RemotePeer,
  SignalingOfferData,
  Upstream,
} from 'p2pcommunication-common';
import * as declaration from '../index';
import { printError, safe } from './printerror';
import RemoteRootServer from './RemoteRootServer';
import RemoteRTCPeer from './RemoteRTCPeer';
import { createDataChannel, fetchDataChannel } from './rtcconnector';

/**
 * It does nothing when it's disconnected with a downstream.
 * It connects to upstream when it's disconnected with a upstream.
 */
export default class ClientLocalPeer<T> implements declaration.LocalPeer<T> {
  readonly localPeer = new LocalPeer<T>();
  /** Decide by root server */
  id: string | null;
  private url: string | null;
  private selectTarget = -1;

  debug = {
    hasPeer: (id: string | null) => {
      for (const conn of this.localPeer.otherStreams) {
        if (conn.id === id) {
          return true;
        }
      }
      return false;
    },
    getUpstreams: () => {
      return this.localPeer.upstreams;
    },
    getOtherStreams: () => {
      return this.localPeer.otherStreams;
    },
    getDownstreams: () => {
      return this.localPeer.downstreams;
    },
  };

  onConnected = this.localPeer.onConnected;
  onBroadcastReceived = this.localPeer.onBroadcastReceived;

  constructor(url: string) {
    this.url = url;
    this.startConnectToServer();
  }

  disconnect() {
    this.url = null;
    const peers = (<RemotePeer<{}>[]>[...this.localPeer.upstreams])
      .concat([...this.localPeer.otherStreams]);
    for (const peer of peers) {
      peer.disconnect();
    }
  }

  broadcast = (payload: T) => this.localPeer.broadcast(payload);

  private startConnectToServer() {
    if (this.url == null) {
      return;
    }
    const url = this.url;
    try {
      this.id = null;
      const upstream = new RemoteRootServer(new WebSocket(url));
      upstream.onIdCreated.subscribe((id) => {
        this.id = id;
      });
      this.addUpstream(upstream);
    } catch (e) {
      printError(e);
      setTimeout(
        () => this.startConnectToServer(),
        3 * 1000,
      );
    }
  }

  private async createNewConnection(
    to: string,
    peerType: PeerType,
    upstream: Upstream<T>,
  ) {
    if (peerType === 'downstream') {
      throw new Error('Assertion error.');
    }
    const peerConnection = new RTCPeerConnection();
    const dataChannel = await createDataChannel(
      peerConnection,
      to,
      upstream,
    );
    await this.addNewConnection(to, peerConnection, dataChannel, peerType);
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
    await this.addNewConnection(from, peerConnection, dataChannel, peerType);
  }

  private async addNewConnection(
    id: string,
    peerConnection: RTCPeerConnection,
    dataChannel: RTCDataChannel,
    peerType: PeerType,
  ) {
    const peer = new RemoteRTCPeer<T>(
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
        await this.addNewDownstream(peer);
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
      this.localPeer.upstreams.delete(upstream);
      if (this.localPeer.upstreams.size <= 0) {
        this.startConnectToServer();
      }
    }));
    upstream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastTo(data, this.localPeer.downstreams);
    });
    this.localPeer.upstreams.add(upstream);
    this.onConnected.next({ peerType: 'upstream', remotePeer: upstream });
  }

  private addNewOtherStream(otherStream: RemotePeer<T>) {
    otherStream.onClosed.subscribe(safe(async () => {
      this.localPeer.otherStreams.delete(otherStream);
    }));
    otherStream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastTo(data, this.localPeer.downstreams);
    });
    this.localPeer.otherStreams.add(otherStream);
    this.onConnected.next({ peerType: 'otherStream', remotePeer: otherStream });
  }

  private async addNewDownstream(downstream: Downstream<T>) {
    if (!this.canAppendDownstream()) {
      const item = this.selectOne([...this.localPeer.downstreams]);
      await provideConnection(downstream, 'toDownstreamOf', item);
      return;
    }
    downstream.onClosed.subscribe(safe(async () => {
      this.localPeer.downstreams.delete(downstream);
    }));
    downstream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastTo(data, this.localPeer.upstreams);
      broadcastTo(data, this.localPeer.otherStreams);
    });
    this.localPeer.downstreams.add(downstream);
    this.onConnected.next({ peerType: 'downstream', remotePeer: downstream });
  }

  private canAppendDownstream() {
    // TODO: count with connectproviders
    const LIMIT = 1; // TODO: limit is dirty condition. It should uses network bandwidth.
    return this.localPeer.downstreams.size < LIMIT;
  }

  private selectOne<T>(array: T[]): T {
    this.selectTarget += 1;
    if (this.selectTarget >= array.length) {
      this.selectTarget = 0;
    }
    return array[this.selectTarget];
  }
}

function broadcastTo(data: any, streams: Set<RemotePeer<any>>) {
  for (const peer of streams) {
    peer.broadcast(data);
  }
}
