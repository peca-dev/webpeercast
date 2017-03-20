import { LocalPeer } from 'p2pcommunication-client';
import * as assert from 'power-assert';
import { CLIENT_MAX_CLIENTS, PORT, ROOT_SERVER_ID, SERVER_MAX_CLIENTS } from './server';

const SERVER = `127.0.0.1:${PORT}`;

export function waitOtherPeer<T>(peer: LocalPeer<T>, callback: () => void) {
  const subscriber = peer.onConnected.subscribe((obj) => {
    if (obj.peerType === 'upstream'
      && obj.remotePeer.id === ROOT_SERVER_ID) {
      return;
    }
    subscriber.unsubscribe();
    callback();
  });
}

export async function fetchServerStatus() {
  return JSON.parse(await (await fetch(`http://${SERVER}`)).text());
}

export async function initPeerTree(
  peers: LocalPeer<{}>[],
  numPeers: number,
) {
  assert(peers.length === 0);
  const numServerPeers = Math.min(numPeers, SERVER_MAX_CLIENTS);
  await initPeers(SERVER, peers, numServerPeers);
  for (const peer of peers) {
    await waitRemotePeers(peer, numServerPeers);
  }
  if (numServerPeers === numPeers) {
    return;
  }
  const leftPeers = numPeers - SERVER_MAX_CLIENTS;
  const numLayer1Peers = Math.min(leftPeers, SERVER_MAX_CLIENTS * CLIENT_MAX_CLIENTS);
  for (let i = 0; i < numLayer1Peers; i += 1) {
    peers.push(new LocalPeer(`ws://${SERVER}`));
  }
  for (const peer of peers.slice(SERVER_MAX_CLIENTS, SERVER_MAX_CLIENTS + numLayer1Peers)) {
    await waitDisconnect(peer, '00000000-0000-0000-0000-000000000000');
    await waitRemotePeers(peer, 1);
  }
  if (numLayer1Peers === leftPeers) {
    return;
  }
  throw new Error('Peers overflow');
}

async function initPeers(server: string, peers: LocalPeer<{}>[], numPeers: number) {
  assert(peers.length === 0);
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

export async function closeAll(peers: LocalPeer<{}>[]) {
  for (const x of peers) {
    x.disconnect();
  }
  await waitPeersCount(0);
}

export async function waitPeersCount(count: number) {
  for (; ;) {
    const serverStatus = await fetchServerStatus(SERVER);
    if (serverStatus.clients.length === count) {
      break;
    }
  }
}

export async function waitDisconnect(localPeer: LocalPeer<{}>, id: string) {
  for (; ;) {
    if (!(<any>localPeer).debug.hasPeer(id)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function waitRemotePeers(localPeer: LocalPeer<{}>, count: number) {
  for (; ;) {
    if ((<any>localPeer).debug.countRemotePeers() === count) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
