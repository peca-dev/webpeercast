import * as Rx from "rxjs";
import RemoteClient from "./remoteclient";
import { getLogger } from "log4js";
const logger = getLogger(__filename);

export function provideConnection<T>(
    server: RemoteClient<T>,
    isOtherStream: boolean,
    client: RemoteClient<T>,
) {
    return new Promise((resolve, reject) => {
        let subscriptions = <Rx.Subscription[]>[];
        subscriptions.push(server.onOffering.subscribe(
            (payload: { to: string, offer: {} }) => {
                if (payload.to !== client.id) {
                    return;
                }
                client.signalOffer(server.id, isOtherStream ? "otherStream" : "upstream", payload.offer);
            },
        ));
        subscriptions.push(server.onIceCandidateEmitting.subscribe(
            (payload: { to: string, iceCandidate: {} }) => {
                if (payload.to !== client.id) {
                    return;
                }
                logger.debug("Send ice to client.");
                client.signalIceCandidate(server.id, payload.iceCandidate);
            },
        ));
        subscriptions.push(client.onAnswering.subscribe(
            (payload: { to: string, answer: {} }) => {
                if (payload.to !== server.id) {
                    return;
                }
                server.signalAnswer(client.id, payload.answer);
            },
        ));
        subscriptions.push(client.onIceCandidateEmitting.subscribe(
            (payload: { to: string, iceCandidate: {} }) => {
                if (payload.to !== server.id) {
                    return;
                }
                logger.debug("Send ice to server.");
                server.signalIceCandidate(client.id, payload.iceCandidate);
            },
        ));
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
        server.requestOfferTo(client.id, isOtherStream ? "otherStream" : "downstream");
    });
}
