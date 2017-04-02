import { Observable } from 'rxjs';

/**
 * LocalPeer is presented the peer of local machine.
 * It has a few RemotePeerRepos.
 * RemotePeerRepo is RemoteRootServer or RemoteUpstream.
 * It has a few RemotePeers.
 * RemotePeers is created by RemotePeerRepo.
 * It has a function what broadcast to known remote peers.
 */
export default class Client<T> {
  private readonly remoteRootServer: RemoteRootServer<T>;
  private readonly remotePeers: Set<RemotePeer<T>>;
  private readonly localPeer: LocalPeer<T>;

  constructor() {
    this.localPeer.subscribe(this.remoteRootServer.offered);
  }

  private addRemotePeer(remotePeer: RemotePeer<T>) {
    this.localPeer.subscribe(remotePeer.offered);
  }
}

export default class Server<T> {
  private readonly remotePeers: Set<RemotePeer<T>>;
  private readonly localPeer: LocalPeer<T>;

  private addRemotePeer() {
  }
}

class LocalPeer<T> {
  subscribe(offered: Observable<{}>) {
    offered.subscribe(
      () => {
        answer().subscribe()
      },
      e => console.error(e.stack || e),
    );
  }
}
