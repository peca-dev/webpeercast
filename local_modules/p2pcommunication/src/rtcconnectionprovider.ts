import { getLogger } from 'log4js';
import * as Rx from 'rxjs';
import RemoteClient from './RemoteClient';
const logger = getLogger(__filename);

export function provideConnection<T>(
  offerer: RemoteClient<T>,
  stream: 'toOtherStreamOf' | 'toDownstreamOf',
  answerer: RemoteClient<T>,
) {
  return new Promise((resolve, reject) => {
    const subscriptions = <Rx.Subscription[]>[];
    subscriptions.push(offerer.onOffering.subscribe(
      (payload: { to: string, offer: {} }) => {
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
      (payload: { to: string, iceCandidate: {} }) => {
        if (payload.to !== answerer.id) {
          return;
        }
        logger.debug('Send ice to client.');
        answerer.signalIceCandidate(offerer.id, payload.iceCandidate);
      },
    ));
    subscriptions.push(answerer.onAnswering.subscribe(
      (payload: { to: string, answer: {} }) => {
        if (payload.to !== offerer.id) {
          return;
        }
        offerer.signalAnswer(answerer.id, payload.answer);
      },
    ));
    subscriptions.push(answerer.onIceCandidateEmitting.subscribe(
      (payload: { to: string, iceCandidate: {} }) => {
        if (payload.to !== offerer.id) {
          return;
        }
        logger.debug('Send ice to server.');
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
