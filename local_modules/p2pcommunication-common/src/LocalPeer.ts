import * as Rx from 'rxjs';
import {
  Broadcastable,
  Downstream,
  LocalPeer as ILocalPeer,
  PeerType,
  RemotePeer,
  Upstream,
} from '../';
import { provideConnection } from './rtcconnectionprovider';

export default class LocalPeer<T> implements ILocalPeer<T> {
  readonly upstreams = new Set<Upstream<T>>();
  readonly otherStreams = new Set<RemotePeer<T>>();
  readonly downstreams = new Set<Downstream<T>>();
  private downstreamSelectTarget = -1;

  readonly onConnected = new Rx.Subject<{ peerType: PeerType; remotePeer: RemotePeer<T>; }>();
  readonly onBroadcastReceived = new Rx.Subject<T>();

  constructor(private readonly downstreamsLimit: number) {
  }

  addNewOtherStream(otherStream: RemotePeer<T>) {
    otherStream.onClosed.subscribe(() => {
      this.otherStreams.delete(otherStream);
    });
    otherStream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastToStreams(data, this.downstreams);
    });
    this.otherStreams.add(otherStream);
    this.onConnected.next({ peerType: 'otherStream', remotePeer: otherStream });
  }

  addNewDownstream(downstream: RemotePeer<T>) {
    if (!this.canAppendDownstream()) {
      const item = this.selectOne([...this.downstreams]);
      return provideConnection(downstream, 'toDownstreamOf', item);
    }
    downstream.onClosed.subscribe(() => {
      this.downstreams.delete(downstream);
    });
    downstream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastToStreams(data, this.upstreams);
      broadcastToStreams(data, this.otherStreams);
    });
    this.downstreams.add(downstream);
    this.onConnected.next({ peerType: 'downstream', remotePeer: downstream });
    return Promise.resolve();
  }

  broadcast(payload: T) {
    broadcastToStreams(payload, this.upstreams);
    broadcastToStreams(payload, this.otherStreams);
    broadcastToStreams(payload, this.downstreams);
  }

  private canAppendDownstream() {
    // TODO: limit is dirty condition. It should uses network bandwidth.
    return this.downstreams.size < this.downstreamsLimit;
  }

  private selectOne<T>(array: T[]): T {
    this.downstreamSelectTarget += 1;
    if (this.downstreamSelectTarget >= array.length) {
      this.downstreamSelectTarget = 0;
    }
    return array[this.downstreamSelectTarget];
  }
}

function broadcastToStreams(data: {}, streams: Set<Broadcastable<{}>>) {
  for (const peer of streams) {
    peer.broadcast(data);
  }
}
