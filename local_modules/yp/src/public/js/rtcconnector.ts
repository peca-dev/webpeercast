import { EventEmitter } from "fbemitter";
import { getLogger } from "log4javascript";
import { safe } from "./printerror";
const logger = getLogger();

export default class RTCConnector extends EventEmitter {
    id: string | null;
    conn = new RTCPeerConnection();
    dataChannel: RTCDataChannel | null;

    constructor() {
        super();

        this.conn.addEventListener("negotiationneeded", safe(async (e: Event) => {
            let offer = await this.conn.createOffer();
            await this.conn.setLocalDescription(offer);
            this.emit("offer", this.conn.localDescription);
        }));
        this.conn.onicecandidate = e => {
            if (e.candidate == null) {
                return;
            }
            this.emit("icecandidate", e.candidate);
        };
        this.conn.ondatachannel = e => {
            e.channel.onopen = e1 => {
                logger.debug("channelopen on client: ", this.id);
                if (this.id == null) {
                    throw new Error("Invaild state.");
                }
                this.emit("channelopen", e.channel);
            };
        };
        setTimeout(
            () => this.emit("timeout"),
            3000,
        );
    }

    makeOffer(id: string) {
        this.id = id;
        this.dataChannel = this.conn.createDataChannel("");
        this.dataChannel.addEventListener("open", safe(async (e: Event) => {
            logger.debug("channelopen on server");
            this.emit("channelopen", this.dataChannel);
        }));
    }

    async receiveOffer(id: string, sd: RTCSessionDescriptionInit) {
        this.id = id;
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
        logger.debug(this.id, "addIceCandidate", candidate);
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
