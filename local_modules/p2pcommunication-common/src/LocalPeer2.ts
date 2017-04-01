/**
 * LocalPeer is presented the peer of local machine.
 * It has a few RemotePeerRepos.
 * RemotePeerRepo is RemoteRootServer or RemoteUpstream.
 * It has a few RemotePeers.
 * RemotePeers is created by RemotePeerRepo.
 * It has a function what broadcast to known remote peers.
 */
export default class LocalPeer {
  private readonly remoteRootServer: RemoteRootServer;
  private readonly remotePeer: RemotePeer;
}
