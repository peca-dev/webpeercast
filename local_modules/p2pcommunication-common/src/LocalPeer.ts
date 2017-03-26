import * as Rx from 'rxjs';
import {
  Broadcastable,
  Downstream,
  LocalPeer as ILocalPeer,
  OtherStream,
  PeerType,
  RemotePeer,
  RemotePeerRepo,
  Upstream,
} from '../';
import { provideConnection } from './rtcconnectionprovider';

export default class LocalPeer<T> implements ILocalPeer<T> {
  readonly upstreams = new Set<Upstream<T>>();
  readonly otherStreams = new Set<OtherStream<T>>();
  readonly downstreams = new Set<Downstream<T>>();
  private downstreamSelectTarget = -1;

  readonly onConnected = new Rx.Subject<{ peerType: PeerType; remotePeer: RemotePeer<T>; }>();
  readonly onBroadcastReceived = new Rx.Subject<T>();

  constructor(
    remotePeerRepo: RemotePeerRepo<T>,
    private readonly downstreamsLimit: number,
    private readonly isRoot: boolean,
  ) {
    remotePeerRepo.downstreamAdded.subscribe((remotePeer) => {
      this.addNewDownstream(remotePeer)
        .catch(e => console.error(e.stack || e));
    });
  }

  disconnect() {
    const peers = (<(Upstream<T> | OtherStream<T>)[]>[...this.upstreams])
      .concat([...this.otherStreams]);
    for (const peer of peers) {
      peer.disconnect();
    }
  }

  setOtherStreamEventsTo(otherStream: RemotePeer<T>) {
    otherStream.onClosed.subscribe(() => {
      this.otherStreams.delete(otherStream);
    });
    otherStream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      broadcastToStreams(data, this.downstreams);
    });
  }

  addNewOtherStream(otherStream: RemotePeer<T>) {
    this.otherStreams.add(otherStream);
    this.onConnected.next({ peerType: 'otherStream', remotePeer: otherStream });
  }

  private addNewDownstream(downstream: RemotePeer<T>) {
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
    if (!this.isRoot || this.downstreams.size < 1) {
      return Promise.resolve();
    }
    return <Promise<void>><any>provideConnectionAsOtherStreamBetween({
      downstream,
      andOneOf: this.downstreams,
    });
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

function provideConnectionAsOtherStreamBetween<T>(
  { downstream, andOneOf: downstreams }
    : { downstream: Downstream<T>, andOneOf: Set<Downstream<T>> },
) {
  return Promise.all(
    [...downstreams]
      .filter(x => x !== downstream)
      .map(otherClient => provideConnection(otherClient, 'toOtherStreamOf', downstream)),
  );
}

function broadcastToStreams(data: {}, streams: Set<Broadcastable<{}>>) {
  for (const peer of streams) {
    peer.broadcast(data);
  }
}
