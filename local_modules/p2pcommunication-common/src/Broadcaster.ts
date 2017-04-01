import * as definitions from '../';

export default class Broadcaster<T> {
  readonly upstreams = new Set<definitions.Upstream<T>>();
  readonly otherStreams = new Set<definitions.OtherStream<T>>();
  readonly downstreams = new Set<definitions.Downstream<T>>();

  constructor(private readonly downstreamsLimit: number) {
  }

  close() {
    const peers = (<(definitions.Broadcastable<{}>)[]>[...this.upstreams])
      .concat([...this.otherStreams])
      .concat([...this.downstreams]);
    for (const peer of peers) {
      peer.disconnect();
    }
  }

  addToUpstreamsThis(upstream: definitions.Upstream<T>) {
    this.upstreams.add(upstream);
    upstream.onClosed.subscribe(() => {
      this.upstreams.delete(upstream);
    });
  }

  addToOtherStreamsThis(otherStream: definitions.OtherStream<T>) {
    this.otherStreams.add(otherStream);
    otherStream.onClosed.subscribe(() => {
      this.otherStreams.delete(otherStream);
    });
  }

  addToDownstreamsThis(downstream: definitions.Downstream<T>) {
    if (this.canAppendDownstream()) {
      throw new Error('Downstreams overflow');
    }
    this.downstreams.add(downstream);
    downstream.onClosed.subscribe(() => {
      this.downstreams.delete(downstream);
    });
  }

  broadcast(payload: T) {
    broadcast(payload, { to: this.upstreams });
    broadcast(payload, { to: this.otherStreams });
    broadcast(payload, { to: this.downstreams });
  }

  broadcastOtherThan(
    otherThan: 'upstreams' | 'otherStreams' | 'downstreams', { this: payload }: { this: T },
  ) {
    if (otherThan !== 'upstreams') {
      broadcast(payload, { to: this.upstreams });
    }
    if (otherThan !== 'otherStreams') {
      broadcast(payload, { to: this.otherStreams });
    }
    if (otherThan !== 'downstreams') {
      broadcast(payload, { to: this.downstreams });
    }
  }

  canAppendDownstream() {
    // TODO: limit is dirty condition. It should uses network bandwidth.
    return this.downstreams.size < this.downstreamsLimit;
  }
}

function broadcast(data: {}, { to: streams }: { to: Set<definitions.Broadcastable<{}>> }) {
  for (const peer of streams) {
    peer.broadcast(data);
  }
}
