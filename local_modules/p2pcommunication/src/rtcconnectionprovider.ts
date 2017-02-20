import * as Rx from "rxjs";
import { PeerType } from "p2pcommunication-common";
import RemoteClient from "./remoteclient";
import { getLogger } from "log4js";
const logger = getLogger("RTCConnectionProvider");

export function provideConnection<T>(server: RemoteClient<T>, peerType: PeerType, client: RemoteClient<T>) {
    return new Promise((resolve, reject) => {
        let subscriptions = <Rx.Subscription[]>[];
        subscriptions.push(server.onOffering.subscribe((payload: { to: string, offer: {} }) => {
            if (payload.to !== client.id) {
                return;
            }
            client.signalOffer(server.id, peerType, payload.offer);
        }));
        subscriptions.push(server.onIceCandidateEmitting.subscribe((payload: { to: string, iceCandidate: {} }) => {
            if (payload.to !== client.id) {
                return;
            }
            logger.debug("Send ice to client.");
            client.signalIceCandidate(server.id, payload.iceCandidate);
        }));
        subscriptions.push(client.onAnswering.subscribe((payload: { to: string, answer: {} }) => {
            if (payload.to !== server.id) {
                return;
            }
            server.signalAnswer(client.id, payload.answer);
        }));
        subscriptions.push(client.onIceCandidateEmitting.subscribe((payload: { to: string, iceCandidate: {} }) => {
            if (payload.to !== server.id) {
                return;
            }
            logger.debug("Send ice to server.");
            server.signalIceCandidate(client.id, payload.iceCandidate);
        }));
        // He don't check connection completed. It should do client.
        setTimeout(
            () => {
                for (let subscription of subscriptions) {
                    subscription.unsubscribe();
                }
                resolve();
            },
            3 * 1000,
        );
        server.requestOfferTo(client.id, peerType);
    });
}
