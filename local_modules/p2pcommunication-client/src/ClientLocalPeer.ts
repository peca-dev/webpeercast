// import * as debugStatic from 'debug';
import * as common from 'p2pcommunication-common';
import { Observable, Subject } from 'rxjs';
import * as declaration from '../index';
import ClientWebSocketConnection from './ClientWebSocketConnection';
import { printError, safe } from './printerror';
import { answerDataChannel, offerDataChannel } from './rtcconnector';
import RTCDataChannelConnection from './RTCDataChannelConnection';

// const debug = debugStatic('p2pcommunication-client:ClientLocalPeer');
const CONFIGURATION = {
  iceServers: [{
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302',
    ],
  }],
};

/**
 * It does nothing when it's disconnected with a downstream.
 * It connects to upstream when it's disconnected with a upstream.
 */
export default class ClientLocalPeer<T> implements declaration.LocalPeer<T> {
  private readonly remotePeerRepo = new ClientRemotePeerRepo();
  readonly localPeer: common.LocalPeer<T>;
  /** Decide by root server */
  id: string | null;
  private url: string | null;

  readonly debug = {
    hasPeer: (id: string | null) => {
      return (<{ id: string }[]>[])
        .concat([...this.localPeer.upstreams])
        .concat([...this.localPeer.otherStreams])
        .concat([...this.localPeer.downstreams])
        .some(x => x.id === id);
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
    countRemotePeers: () => {
      return this.localPeer.upstreams.size
        + this.localPeer.otherStreams.size
        + this.localPeer.downstreams.size;
    },
  };

  readonly onConnected: typeof common.LocalPeer.prototype.onConnected;
  readonly onBroadcastReceived: typeof common.LocalPeer.prototype.onBroadcastReceived;

  constructor(url: string, downstreamsLimit: number) {
    this.localPeer = new common.LocalPeer<T>(this.remotePeerRepo, downstreamsLimit, false);
    this.onConnected = this.localPeer.onConnected;
    this.onBroadcastReceived = this.localPeer.onBroadcastReceived;
    this.url = url;
    this.startConnectToServer();
  }

  disconnect() {
    this.url = null;
    this.localPeer.disconnect();
  }

  broadcast = (payload: T) => this.localPeer.broadcast(payload);

  private startConnectToServer() {
    if (this.url == null) {
      return;
    }
    const url = this.url;
    try {
      this.id = null;
      const upstream = new common.RemotePeer(
        '00000000-0000-0000-0000-000000000000',
        new ClientWebSocketConnection(new WebSocket(url)),
      );
      upstream.onIdCreated.subscribe((id) => {
        this.id = id;
      });
      this.setUpstreamEventsTo(upstream);
      this.addUpstream(upstream);
    } catch (e) {
      printError(e);
      setTimeout(
        () => this.startConnectToServer(),
        3 * 1000,
      );
    }
  }

  private offerNewConnection(
    to: string,
    peerType: common.PeerType,
    upstream: common.Upstream<T>,
  ) {
    if (peerType === 'downstream') {
      throw new Error('Assertion error.');
    }
    const peerConnection = new RTCPeerConnection(CONFIGURATION);
    const dataChannel = peerConnection.createDataChannel('');
    const peer = new common.RemotePeer<T>(
      to,
      new RTCDataChannelConnection(peerConnection, dataChannel),
    );
    this.setEventTo(peerType, peer);
    return offerDataChannel(
      peerConnection,
      dataChannel,
      to,
      upstream,
    ).toPromise()
      .then(() => this.addNewConnection(peerType, peer))
      .catch((e) => {
        peer.disconnect();
        throw e;
      });
  }

  private answerNewConnection(
    from: string,
    peerType: common.PeerType,
    offer: RTCSessionDescriptionInit,
    upstream: common.Upstream<T>,
  ) {
    const peerConnection = new RTCPeerConnection(CONFIGURATION);
    return answerDataChannel(
      peerConnection,
      from,
      offer,
      upstream,
    )
      .flatMap((e) => {
        const dataChannel = e.channel;
        const peer = new common.RemotePeer<T>(
          from,
          new RTCDataChannelConnection(peerConnection, e.channel),
        );
        this.setEventTo(peerType, peer);
        return Observable.fromEvent(dataChannel, 'open')
          .first()
          .map(() => peer)
          .timeout(10 * 1000);
      })
      .toPromise()
      .then(peer => this.addNewConnection(peerType, peer));
  }

  private async setEventTo(peerType: common.PeerType, peer: common.RemotePeer<T>) {
    switch (peerType) {
      case 'upstream':
        this.setUpstreamEventsTo(peer);
        break;
      case 'otherStream':
        this.localPeer.setOtherStreamEventsTo(peer);
        break;
      default:
        break;
    }
  }

  private async addNewConnection(peerType: common.PeerType, peer: common.RemotePeer<T>) {
    switch (peerType) {
      case 'upstream':
        this.addUpstream(peer);
        break;
      case 'otherStream':
        this.localPeer.addNewOtherStream(peer);
        break;
      case 'downstream':
        this.remotePeerRepo.downstreamAdded.next(peer);
        break;
      default:
        throw new Error(`Unsupported peerType: ${peerType}`);
    }
  }

  private setUpstreamEventsTo(upstream: common.RemotePeer<T>) {
    upstream.onOfferRequesting.subscribe(safe(async (data: common.OfferRequestData) => {
      await this.offerNewConnection(data.to, data.peerType, upstream);
    }));
    upstream.onSignalingOffer.subscribe(safe(async (data: common.SignalingOfferData) => {
      await this.answerNewConnection(data.from, data.peerType, data.offer, upstream);
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
  }

  private addUpstream(upstream: common.RemotePeer<T>) {
    this.localPeer.upstreams.add(upstream);
    this.onConnected.next({ peerType: 'upstream', remotePeer: upstream });
  }
}

function broadcastTo<T>(data: T, streams: Set<common.Broadcastable<T>>) {
  for (const peer of streams) {
    peer.broadcast(data);
  }
}

class ClientRemotePeerRepo<T> {
  downstreamAdded = new Subject<common.RemotePeer<T>>();
}
