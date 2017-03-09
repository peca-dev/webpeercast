import * as createDebug from 'debug';
import { AnonymousSubscription } from 'rxjs/Subscription';
import { SignalingPeer } from '../';

declare const __filename: string;
const debug = createDebug(__filename);

export function provideConnection(
  offerer: SignalingPeer,
  stream: 'toOtherStreamOf' | 'toDownstreamOf',
  answerer: SignalingPeer,
) {
  return new Promise((resolve, reject) => {
    const subscriptions = <AnonymousSubscription[]>[];
    subscriptions.push(offerer.onOffering.subscribe(
      (payload: { to: string, offer: RTCSessionDescriptionInit }) => {
        if (payload.to !== answerer.id) {
          return;
        }
        answerer.signalOffer(
          offerer.id,
          stream === 'toOtherStreamOf' ? 'otherStream' : 'downstream',
          payload.offer,
        );
      },
    ));
    subscriptions.push(offerer.onIceCandidateEmitting.subscribe(
      (payload: { to: string, iceCandidate: RTCIceCandidateInit }) => {
        if (payload.to !== answerer.id) {
          return;
        }
        debug('Send ice to client.');
        answerer.signalIceCandidate(offerer.id, payload.iceCandidate);
      },
    ));
    subscriptions.push(answerer.onAnswering.subscribe(
      (payload: { to: string, answer: RTCSessionDescriptionInit }) => {
        if (payload.to !== offerer.id) {
          return;
        }
        offerer.signalAnswer(answerer.id, payload.answer);
      },
    ));
    subscriptions.push(answerer.onIceCandidateEmitting.subscribe(
      (payload: { to: string, iceCandidate: RTCIceCandidateInit }) => {
        if (payload.to !== offerer.id) {
          return;
        }
        debug('Send ice to server.');
        offerer.signalIceCandidate(answerer.id, payload.iceCandidate);
      },
    ));
    // He don't check connection completed. It should do client.
    setTimeout(
      () => {
        for (const subscription of subscriptions) {
          subscription.unsubscribe();
        }
        resolve();
      },
      3 * 1000,
    );
    offerer.requestOffer(answerer.id, stream === 'toOtherStreamOf' ? 'otherStream' : 'upstream');
  });
}
