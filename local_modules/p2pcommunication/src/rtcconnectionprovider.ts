import * as Rx from "rxjs";
import RemoteClient from "./remoteclient";
import { getLogger } from "log4js";
const logger = getLogger("RTCConnectionProvider");

export default class RTCConnectionProvider {
    onTimedOut = new Rx.Subject<{}>();

    constructor(server: RemoteClient, client: RemoteClient) {
        let serverRTCOfferReceivedSubscription
            = server.onOffering.subscribe((payload: { to: string, offer: {} }) => {
                if (payload.to !== client.id) {
                    return;
                }
                client.receiveRTCOffer(server.id, payload.offer);
            });
        let serverIceCandidateReceivedSubscription
            = server.onIceCandidateEmitting.subscribe((payload: { to: string, iceCandidate: {} }) => {
                if (payload.to !== client.id) {
                    return;
                }
                logger.debug("Send ice to client.");
                client.receiveIceCandidate(server.id, payload.iceCandidate);
            });
        let clientRTCAnswerReceivedSubscription
            = client.onAnswering.subscribe((payload: { to: string, answer: {} }) => {
                if (payload.to !== server.id) {
                    return;
                }
                server.receiveRTCAnswer(client.id, payload.answer);
            });
        let clientIceCandidateReceivedSubscription
            = client.onIceCandidateEmitting.subscribe((payload: { to: string, iceCandidate: {} }) => {
                if (payload.to !== server.id) {
                    return;
                }
                logger.debug("Send ice to server.");
                server.receiveIceCandidate(client.id, payload.iceCandidate);
            });
        // He don't check connection completed. It should do client.
        setTimeout(
            () => {
                serverRTCOfferReceivedSubscription.unsubscribe();
                serverIceCandidateReceivedSubscription.unsubscribe();
                clientRTCAnswerReceivedSubscription.unsubscribe();
                clientIceCandidateReceivedSubscription.unsubscribe();
                this.onTimedOut.subscribe();
                this.onTimedOut.complete();
            },
            3 * 1000,
        );

        server.makeRTCOffer(client.id);
    }
}
