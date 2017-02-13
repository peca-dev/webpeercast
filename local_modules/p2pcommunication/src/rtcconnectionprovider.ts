import { EventEmitter } from "events";
import RemoteClient from "./remoteclient";
import { getLogger } from "log4js";
const logger = getLogger("RTCConnectionProvider");

export default class RTCConnectionProvider extends EventEmitter {
    constructor(server: RemoteClient, client: RemoteClient) {
        super();

        let serverReceiveRTCOffer = (payload: { to: string, offer: {} }) => {
            if (payload.to !== client.id) {
                return;
            }
            client.receiveRTCOffer(server.id, payload.offer);
        };
        let serverReceiveIceCandidate = (payload: { to: string, iceCandidate: {} }) => {
            if (payload.to !== client.id) {
                return;
            }
            logger.debug("Send ice to client.");
            client.receiveIceCandidate(server.id, payload.iceCandidate);
        };
        let clientReceiveRTCAnswer = (payload: { to: string, answer: {} }) => {
            if (payload.to !== server.id) {
                return;
            }
            server.receiveRTCAnswer(client.id, payload.answer);
        };
        let clientReceiveIceCandidate = (payload: { to: string, iceCandidate: {} }) => {
            if (payload.to !== server.id) {
                return;
            }
            logger.debug("Send ice to server.");
            server.receiveIceCandidate(client.id, payload.iceCandidate);
        };
        server.on("receiveRTCOffer", serverReceiveRTCOffer);
        server.on("receiveIceCandidate", serverReceiveIceCandidate);
        client.on("receiveRTCAnswer", clientReceiveRTCAnswer);
        client.on("receiveIceCandidate", clientReceiveIceCandidate);
        // He don't check connection completed. It should do client.
        setTimeout(
            () => {
                server.removeListener("receiveRTCOffer", serverReceiveRTCOffer);
                server.removeListener("receiveIceCandidate", serverReceiveIceCandidate);
                client.removeListener("receiveRTCAnswer", clientReceiveRTCAnswer);
                client.removeListener("receiveIceCandidate", clientReceiveIceCandidate);
                this.emit("timeout");
            },
            3 * 1000,
        );

        server.makeRTCOffer(client.id);
    }
}
