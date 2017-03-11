import * as assert from 'power-assert';
import ClientLocalPeer from '../ClientLocalPeer';

export const server = '127.0.0.1:8080';

export function waitOtherPeer<T>(peer: ClientLocalPeer<T>, callback: () => void) {
  const subscriber = peer.onConnected.subscribe((obj) => {
    if (obj.peerType === 'upstream'
      && obj.remotePeer.id === '00000000-0000-0000-0000-000000000000') {
      return;
    }
    subscriber.unsubscribe();
    callback();
  });
}

export async function fetchServerStatus() {
  return JSON.parse(await (await fetch(`http://${server}`)).text());
}

export async function initPeers(peers: ClientLocalPeer<{}>[], numPeers: number) {
  const serverStatus1 = await fetchServerStatus();
  assert(serverStatus1.clients.length === 0);
  for (let i = 0; i < numPeers; i += 1) {
    peers.push(new ClientLocalPeer(`ws://${server}`));
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

export async function closeAll(peers: ClientLocalPeer<{}>[]) {
  for (const x of peers) {
    x.disconnect();
  }
  await waitPeersCount(0);
}

export async function waitPeersCount(count: number) {
  for (; ;) {
    const serverStatus = await fetchServerStatus();
    if (serverStatus.clients.length === count) {
      break;
    }
  }
}
