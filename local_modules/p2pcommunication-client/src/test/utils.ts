import LocalPeer from '../LocalPeer';

export const server = '127.0.0.1:8080';

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

export async function fetchServerStatus() {
  return JSON.parse(await (await fetch(`http://${server}`)).text());
}
