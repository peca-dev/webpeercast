import { EventEmitter } from "events";
import RemoteClient from "./remoteclient";
import { getLogger } from "log4js";
const logger = getLogger("RTCConnectionProvider");

export default class RTCConnectionProvider extends EventEmitter {
    constructor(server: RemoteClient, client: RemoteClient) {
        super();

        let serverReceiveRTCOffer = (payload: { to: string, offer: RTCSessionDescriptionInit }) => {
            if (payload.to !== client.id) {
                return;
            }
            client.receiveRTCOffer(server.id, payload.offer);
        };
        let serverReceiveIceCandidate = (payload: { to: string, iceCandidate: RTCIceCandidateInit }) => {
            if (payload.to !== client.id) {
                return;
            }
            logger.debug("Send ice to client.");
            client.receiveIceCandidate(server.id, payload.iceCandidate);
        };
        let clientReceiveRTCAnswer = (payload: { to: string, answer: RTCSessionDescriptionInit }) => {
            if (payload.to !== server.id) {
                return;
            }
            server.receiveRTCAnswer(client.id, payload.answer);
        };
        let clientReceiveIceCandidate = (payload: { to: string, iceCandidate: RTCIceCandidateInit }) => {
            if (payload.to !== server.id) {
                logger.debug("Invalid iceCandidate data from client to server.");
                return;
            }
            logger.debug("Send ice to server.");
            server.receiveIceCandidate(client.id, payload.iceCandidate);
        };
        server.once("receiveRTCOffer", serverReceiveRTCOffer);
        server.on("receiveIceCandidate", serverReceiveIceCandidate);
        client.once("receiveRTCAnswer", clientReceiveRTCAnswer);
        client.on("receiveIceCandidate", clientReceiveIceCandidate);
        setTimeout(
            () => {
                server.removeListener("receiveRTCOffer", serverReceiveRTCOffer);
                server.removeListener("receiveIceCandidate", serverReceiveIceCandidate);
                client.removeListener("receiveRTCAnswer", clientReceiveRTCAnswer);
                client.removeListener("receiveIceCandidate", clientReceiveIceCandidate);
                this.emit("timeout");
                logger.debug("Timeout.");
            },
            3 * 1000,
        );

        server.makeRTCOffer(client.id);
    }
}
