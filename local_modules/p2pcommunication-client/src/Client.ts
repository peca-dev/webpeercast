import { Observable } from 'rxjs';
import RemoteClient from './RemoteClient';
import RemoteRootServer from './RemoteRootServer';

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
  private readonly remoteClients: Map<string, RemoteClient<T>>;
  private readonly localPeer: LocalPeer<T>;

  constructor() {
    this.subscribe(this.remoteRootServer.signaling);
  }

  private addRemotePeer(remoteClient: RemoteClient<T>) {
    this.subscribe(remoteClient.signaling);
  }

  private subscribe(signaling: Observable<{ from: string, signal: {} }>) {
    signaling.subscribe(({ from, signal }) => {
      let remoteClient = this.remoteClients.get(from);
      if (remoteClient == null) {
        remoteClient = new RemoteClient(from);
        remoteClient.
        this.remoteClients.set(from, remoteClient);
        
      }
    });
  }
}

export default class Server<T> {
  private readonly remotePeers: Set<RemotePeer<T>>;
  private readonly localPeer: LocalPeer<T>;

  private addRemotePeer() {
  }
}

class LocalPeer<T> {
}
