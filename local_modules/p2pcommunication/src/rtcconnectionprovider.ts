import * as Rx from "rxjs";
import RemoteClient from "./remoteclient";
import { getLogger } from "log4js";
const logger = getLogger("RTCConnectionProvider");

export default class RTCConnectionProvider {
    timedOut = new Rx.Subject<{}>();

    constructor(server: RemoteClient, client: RemoteClient) {
        let serverRTCOfferReceivedSubscription
            = server.rtcOfferReceived.subscribe((payload: { to: string, offer: {} }) => {
                if (payload.to !== client.id) {
                    return;
                }
                client.receiveRTCOffer(server.id, payload.offer);
            });
        let serverIceCandidateReceivedSubscription
            = server.iceCandidateReceived.subscribe((payload: { to: string, iceCandidate: {} }) => {
                if (payload.to !== client.id) {
                    return;
                }
                logger.debug("Send ice to client.");
                client.receiveIceCandidate(server.id, payload.iceCandidate);
            });
        let clientRTCAnswerReceivedSubscription
            = client.rtcAnswerReceived.subscribe((payload: { to: string, answer: {} }) => {
                if (payload.to !== server.id) {
                    return;
                }
                server.receiveRTCAnswer(client.id, payload.answer);
            });
        let clientIceCandidateReceivedSubscription
            = client.iceCandidateReceived.subscribe((payload: { to: string, iceCandidate: {} }) => {
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
                this.timedOut.subscribe();
                this.timedOut.complete();
            },
            3 * 1000,
        );

        server.makeRTCOffer(client.id);
    }
}
