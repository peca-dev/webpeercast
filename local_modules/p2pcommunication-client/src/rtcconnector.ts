import {
  SignalingIceCandidateData,
  Upstream,
} from 'p2pcommunication-common';
import { Observable, Subscribable } from 'rxjs/Observable';
import { ISubscription } from 'rxjs/Subscription';
import { AnonymousSubscription } from 'rxjs/Subscription';
import { safe } from './printerror';

export function offerDataChannel(pc: RTCPeerConnection, to: string, upstream: Upstream<{}>) {
  return exchangeIceCandidate(pc, to, upstream, async () => {
    let dataChannel: RTCDataChannel | null = null;
    await waitEvent(pc, 'negotiationneeded', () => {
      dataChannel = pc.createDataChannel('');
    });
    await exchangeOfferWithAnswer(pc, to, upstream);
    await waitEvent(dataChannel!, 'open');
    return dataChannel!;
  });
}

async function exchangeOfferWithAnswer(
  pc: RTCPeerConnection,
  to: string,
  upstream: Upstream<{}>,
) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  upstream.offerTo(to, offer);
  const payload = await waitMessage(upstream.onSignalingAnswer, to);
  await pc.setRemoteDescription(payload.answer);
}

export function answerDataChannel(
  pc: RTCPeerConnection,
  from: string,
  offer: RTCSessionDescriptionInit,
  upstream: Upstream<{}>,
) {
  return exchangeIceCandidate(pc, from, upstream, async () => {
    await exchangeAnswerWithOffer(pc, from, offer, upstream);
    const event: RTCDataChannelEvent = <any>await waitEvent(pc, 'datachannel');
    await waitEvent(event.channel, 'open');
    return event.channel;
  });
}

async function exchangeAnswerWithOffer(
  pc: RTCPeerConnection,
  from: string,
  offer: RTCSessionDescriptionInit,
  upstream: Upstream<{}>,
) {
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  upstream.answerTo(from, answer);
}

async function exchangeIceCandidate<T>(
  pc: RTCPeerConnection,
  to: string,
  upstream: Upstream<{}>,
  func: () => Promise<T>,
) {
  const subscriptions: ISubscription[] = [];
  subscriptions.push(Observable.fromEventPattern<RTCPeerConnectionIceEvent>(
    (handler: any) => { pc.onicecandidate = handler; },
    () => { pc.onicecandidate = <any>null; },
  )
    .filter(e => e.candidate != null)
    .subscribe((e) => {
      upstream.emitIceCandidateTo(to, e.candidate!);
    }));
  subscriptions.push(upstream.onSignalingIceCandidate
    .filter(payload => payload.from === to)
    .subscribe(safe(async (payload: SignalingIceCandidateData) => {
      await pc.addIceCandidate(payload.iceCandidate);
    })));
  try {
    return await func();
  } finally {
    for (const subscription of subscriptions) {
      subscription.unsubscribe();
    }
  }
}

function waitMessage(observable: Subscribable<{ from: string }>, from: string) {
  return new Promise<any>((resolve, reject) => {
    let subscription: AnonymousSubscription;
    const timer = setTimeout(
      () => {
        subscription.unsubscribe();
        reject(new Error(`Timeout message from: ${from}.`));
      },
      3 * 1000,
    );
    subscription = observable.subscribe(safe(async (payload: { from: string }) => {
      if (payload.from !== from) {
        return;
      }
      clearTimeout(timer);
      subscription.unsubscribe();
      resolve(payload);
    }));
  });
}

function waitEvent<T extends Event>(eventTarget: EventTarget, event: string, func?: Function) {
  return new Promise<T>((resolve, reject) => {
    Observable.fromEvent<T>(eventTarget, event).timeout(3 * 1000).first()
      .subscribe(resolve, reject);
    if (func != null) {
      func();
    }
  });
}
