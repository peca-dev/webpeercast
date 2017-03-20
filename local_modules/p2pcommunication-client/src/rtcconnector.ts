import {
  SignalingIceCandidateData,
  Upstream,
} from 'p2pcommunication-common';
import { Observable, Subscribable } from 'rxjs/Observable';
import { ISubscription } from 'rxjs/Subscription';
import { safe } from './printerror';

export function offerDataChannel(
  pc: RTCPeerConnection,
  dataChannel: RTCDataChannel,
  to: string, upstream: Upstream<{}>,
) {
  return exchangeIceCandidate(pc, to, upstream, () => new Observable((subscribe) => {
    Observable.fromEvent(dataChannel, 'open')
      .timeout(10 * 1000)
      .first()
      .subscribe(() => subscribe.complete(), e => subscribe.error(e));
    Observable.fromEvent(pc, 'negotiationneeded')
      .timeout(3 * 1000)
      .first()
      .subscribe(
      () => {
        exchangeOfferWithAnswer(pc, to, upstream)
          .catch(e => subscribe.error(e));
      },
      (e) => {
        subscribe.error(e);
      });
  }));
}

async function exchangeOfferWithAnswer(
  pc: RTCPeerConnection,
  to: string,
  upstream: Upstream<{}>,
) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  upstream.offerTo(to, offer);
  const payload = await waitMessage(cast(upstream.onSignalingAnswer), to);
  await pc.setRemoteDescription(payload.answer);
}

export function answerDataChannel(
  pc: RTCPeerConnection,
  from: string,
  offer: RTCSessionDescriptionInit,
  upstream: Upstream<{}>,
) {
  return exchangeIceCandidate(pc, from, upstream, () => Observable.fromPromise((async () => {
    await exchangeAnswerWithOffer(pc, from, offer, upstream);
    const event = await Observable.fromEvent<RTCDataChannelEvent>(pc, 'datachannel')
      .first()
      .timeout(3 * 1000)
      .toPromise();
    await waitEvent(event.channel, 'open');
    return event.channel;
  })()));
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

function exchangeIceCandidate<T>(
  pc: RTCPeerConnection,
  to: string,
  upstream: Upstream<{}>,
  func: () => Observable<T>,
) {
  const subscriptions: ISubscription[] = [];
  subscriptions.push(Observable.fromEvent<RTCPeerConnectionIceEvent>(pc, 'icecandidate')
    .filter(e => e.candidate != null)
    .subscribe((e) => {
      upstream.emitIceCandidateTo(to, e.candidate!);
    }));
  subscriptions.push(upstream.onSignalingIceCandidate
    .filter(payload => payload.from === to)
    .subscribe(safe(async (payload: SignalingIceCandidateData) => {
      await pc.addIceCandidate(payload.iceCandidate);
    })));
  return func().finally(() => {
    for (const subscription of subscriptions) {
      subscription.unsubscribe();
    }
  });
}

function waitMessage<T extends { from: string }>(observable: Observable<T>, from: string) {
  return observable
    .filter(payload => payload.from === from)
    .timeout(10 * 1000)
    .first()
    .toPromise();
}

function waitEvent<T extends Event>(eventTarget: EventTarget, event: string, func?: Function) {
  return new Promise<T>((resolve, reject) => {
    Observable.fromEvent<T>(eventTarget, event)
      .timeout(10 * 1000)
      .first()
      .subscribe(resolve, reject);
    if (func != null) {
      func();
    }
  });
}

function cast<T>(obj: Subscribable<T>) {
  return <Observable<T>>obj;
}
