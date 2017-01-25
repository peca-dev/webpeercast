import { EventEmitter } from "fbemitter";
import { getLogger } from "log4javascript";
const logger = getLogger();

export default class RTCConnector extends EventEmitter {
    conn = new RTCPeerConnection();
    dataChannel: RTCDataChannel | null;

    constructor() {
        super();

        this.conn.addEventListener("negotiationneeded", async e => {
            let offer = await this.conn.createOffer();
            await this.conn.setLocalDescription(offer);
            this.emit("offer", this.conn.localDescription);
        });
        this.conn.onicecandidate = e => {
            if (e.candidate == null) {
                return;
            }
            this.emit("icecandidate", e.candidate);
        };
        this.conn.onicecandidateerror = e => {
            logger.debug(e);
        };
        this.conn.oniceconnectionstatechange = e => {
            logger.debug(e);
        };
        this.conn.onconnectionstatechange = e => {
            logger.debug(e);
        };
        this.conn.ondatachannel = e => {
            e.channel.onopen = e1 => {
                logger.debug("remote open");
            };
        };
        setTimeout(
            () => this.emit("timeout"),
            3000,
        );
    }

    makeOffer() {
        this.dataChannel = this.conn.createDataChannel("");
        this.dataChannel.addEventListener("open", e => {
            logger.debug("open");
        });
    }

    async receiveOffer(sd: RTCSessionDescriptionInit) {
        await this.conn.setRemoteDescription(sd);
        let answer = await this.conn.createAnswer();
        await this.conn.setLocalDescription(answer);
        return this.conn.localDescription!;
    }

    async receiveAnswer(sd: RTCSessionDescriptionInit) {
        await this.conn.setRemoteDescription(sd);
        this.printState();
    }

    async receiveIceCandidate(candidate: RTCIceCandidateInit) {
        logger.debug("addIceCandidate", candidate);
        await this.conn.addIceCandidate(candidate);
    }

    printState() {
        logger.debug(
            "printState",
            this.conn.connectionState,
            this.conn.iceConnectionState,
            this.conn.iceGatheringState,
            this.conn.signalingState,
        );
        this.conn.getStats()
            .then(r => {
                logger.debug(
                    "printState",
                    r,
                );
            });
    }
}
