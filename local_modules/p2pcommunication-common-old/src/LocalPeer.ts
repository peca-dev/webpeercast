import * as Rx from 'rxjs';
import {
  Downstream,
  LocalPeer as ILocalPeer,
  PeerType,
  RemotePeer,
  RemotePeerRepo,
} from '../';
import Broadcaster from './Broadcaster';
import { provideConnection } from './rtcconnectionprovider';

export default class LocalPeer<T> implements ILocalPeer<T> {
  readonly broadcaster: Broadcaster<T>;
  private downstreamSelectTarget = -1;

  readonly onConnected = new Rx.Subject<{ peerType: PeerType; remotePeer: RemotePeer<T>; }>();
  readonly onBroadcastReceived = new Rx.Subject<T>();

  constructor(
    remotePeerRepo: RemotePeerRepo<T>,
    downstreamsLimit: number,
    private readonly isRoot: boolean,
  ) {
    this.broadcaster = new Broadcaster<T>(downstreamsLimit);
    remotePeerRepo.downstreamAdded.subscribe((remotePeer) => {
      this.addNewDownstream(remotePeer)
        .catch(e => console.error(e.stack || e));
    });
    // クライアントはまずサーバーにつなぎにいく。枠があればアップストリームに登録。なければ他のピアをアップストリームに登録。
    // シグナリング担当者を持つ
    // 自身の接続を任せる
    // アップストリームかwebsocketが下流を持ってくる
  }

  close() {
    this.broadcaster.close();
  }
  /**
   * @deprecated
   */
  disconnect() {
    return this.close();
  }

  setOtherStreamEventsTo(otherStream: RemotePeer<T>) {
    otherStream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      this.broadcaster.broadcastOtherThan('otherStreams', { this: data });
    });
  }

  addNewOtherStream(otherStream: RemotePeer<T>) {
    this.broadcaster.addToOtherStreamsThis(otherStream);
    this.onConnected.next({ peerType: 'otherStream', remotePeer: otherStream });
  }

  private addNewDownstream(downstream: RemotePeer<T>) {
    if (!this.broadcaster.canAppendDownstream()) {
      const item = this.selectOne([...this.downstreams]);
      return provideConnection(downstream, 'toDownstreamOf', item)
        .then(() => downstream.disconnect());
    }
    downstream.onBroadcasting.subscribe((data) => {
      this.onBroadcastReceived.next(data);
      if (this.isRoot) {
        return;
      }
      this.broadcaster.broadcastOtherThan('downstreams', { this: data });
    });
    this.broadcaster.addToDownstreamsThis(downstream);
    this.onConnected.next({ peerType: 'downstream', remotePeer: downstream });
    if (!this.isRoot || this.downstreams.size < 1) {
      return Promise.resolve();
    }
    return <Promise<void>><any>provideConnectionAsOtherStreamBetween({
      downstream,
      andOneOf: this.downstreams,
    });
  }

  broadcast(payload: T) { return this.broadcaster.broadcast(payload); }

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
