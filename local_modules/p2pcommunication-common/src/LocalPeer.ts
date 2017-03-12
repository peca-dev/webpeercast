import * as Rx from 'rxjs';
import {
  Downstream,
  PeerType,
  RemotePeer,
  Upstream,
} from '../';

export default class LocalPeer<T> {
  upstreams = new Set<Upstream<T>>();
  otherStreams = new Set<RemotePeer<T>>();
  downstreams = new Set<Downstream<T>>();

  onConnected = new Rx.Subject<{ peerType: PeerType; remotePeer: RemotePeer<T>; }>();
  onBroadcastReceived = new Rx.Subject<T>();

  broadcast(payload: T) {
    broadcastToStreams(payload, this.upstreams);
    broadcastToStreams(payload, this.otherStreams);
    broadcastToStreams(payload, this.downstreams);
  }
}

function broadcastToStreams(data: {}, streams: Set<RemotePeer<{}>>) {
  for (const peer of streams) {
    peer.broadcast(data);
  }
}
