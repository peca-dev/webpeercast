import { LocalPeer } from 'p2pcommunication-client';
import * as assert from 'power-assert';

export function waitOtherPeer<T>(peer: LocalPeer<T>, callback: () => void) {
  const subscriber = peer.onConnected.subscribe((obj) => {
    if (obj.peerType === 'upstream'
      && obj.remotePeer.id === '00000000-0000-0000-0000-000000000000') {
      return;
    }
    subscriber.unsubscribe();
    callback();
  });
}

export async function fetchServerStatus(server: string) {
  return JSON.parse(await (await fetch(`http://${server}`)).text());
}

export async function initPeers(server: string, peers: LocalPeer<{}>[], numPeers: number) {
  const serverStatus1 = await fetchServerStatus(server);
  assert(serverStatus1.clients.length === 0);
  for (let i = 0; i < numPeers; i += 1) {
    peers.push(new LocalPeer(`ws://${server}`));
  }
  await new Promise((resolve, reject) => {
    let count = peers.length;
    const countDown = () => {
      count -= 1;
      if (count === 0) {
        resolve();
      }
    };
    for (const peer of peers) {
      waitOtherPeer(peer, countDown);
    }
  });
}

export async function closeAll(server: string, peers: LocalPeer<{}>[]) {
  for (const x of peers) {
    x.disconnect();
  }
  await waitPeersCount(server, 0);
}

export async function waitPeersCount(server: string, count: number) {
  for (; ;) {
    const serverStatus = await fetchServerStatus(server);
    if (serverStatus.clients.length === count) {
      break;
    }
  }
}

export async function waitRemotePeers(localPeer: LocalPeer<{}>, count: number) {
  for (; ;) {
    if ((<any>localPeer).debug.countRemotePeers() === count) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
