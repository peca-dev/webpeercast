import { EventEmitter, EventSubscription } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { safe } from "./printerror";
import { Upstream } from "./upstream";
const logger = getLogger(__filename);

export default class RTCConnector extends EventEmitter {
    id: string | null;
    conn = new RTCPeerConnection();
    dataChannel: RTCDataChannel | null;

    constructor() {
        super();

        this.conn.addEventListener("negotiationneeded", safe(logger, async (e: Event) => {
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
        this.dataChannel.addEventListener("open", safe(logger, async (e: Event) => {
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
        logger.debug(this.id!, "addIceCandidate", candidate);
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

export async function createDataChannel(pc: RTCPeerConnection, to: string, upstream: Upstream) {
    exchangeIceCandidate(pc, to, upstream, async () => {
        let dataChannel: RTCDataChannel | null = null;
        await waitEvent(pc, "negotiationneeded", () => {
            dataChannel = pc.createDataChannel("");
        });
        await exchangeOfferWithAnswer(pc, to, upstream);
        logger.debug("wait open");
        await waitEvent(dataChannel!, "open");
        logger.debug("opened");
        return dataChannel!;
    });
}

async function exchangeOfferWithAnswer(pc: RTCPeerConnection, to: string, upstream: Upstream) {
    let offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    upstream.send({
        type: "receiveRTCOffer",
        payload: { to, offer },
    });
    logger.debug("waiting receiveRTCAnswer");
    let payload = await waitMessage(upstream, "receiveRTCAnswer", to);
    await pc.setRemoteDescription(payload.answer);
    logger.debug("complete exchangeOfferWithAnswer");
}

export async function fetchDataChannel(
    pc: RTCPeerConnection,
    from: string,
    offer: RTCSessionDescriptionInit,
    upstream: Upstream,
) {
    exchangeIceCandidate(pc, from, upstream, async () => {
        await exchangeAnswerWithOffer(pc, from, offer, upstream);
        logger.debug("wait datachannel");
        let event: RTCDataChannelEvent = <any>await waitEvent(pc, "datachannel");
        logger.debug("wait open2");
        await waitEvent(event.channel, "open");
        logger.debug("opened2");
        return event.channel;
    });
}

async function exchangeIceCandidate<T>(
    pc: RTCPeerConnection,
    to: string,
    upstream: Upstream,
    func: () => Promise<T>,
) {
    let iceCandidateListener = (e: RTCPeerConnectionIceEvent) => {
        if (e.candidate == null) {
            return;
        }
        upstream.send({
            type: "receiveIceCandidate",
            payload: { to, iceCandidate: e.candidate },
        });
    };
    pc.addEventListener("icecandidate", iceCandidateListener);
    let receiveIceCandidateSubscribe = upstream.addListener(
        "receiveIceCandidate",
        safe(logger, async (payload: any) => {
            pc.addIceCandidate(payload.iceCandidate);
            receiveIceCandidateSubscribe.remove();
        }),
    );
    try {
        return await func();
    } finally {
        pc.removeEventListener("icecandidate", iceCandidateListener);
        receiveIceCandidateSubscribe.remove();
    }
}

async function exchangeAnswerWithOffer(
    pc: RTCPeerConnection,
    from: string,
    offer: RTCSessionDescriptionInit,
    upstream: Upstream,
) {
    await pc.setRemoteDescription(offer);
    let answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    upstream.send({
        type: "receiveRTCAnswer",
        payload: { to: from, answer: pc.localDescription! },
    });
    logger.debug("complete exchangeAnswerWithOffer");
}

function waitMessage(upstream: Upstream, type: string, from: string) {
    return new Promise<any>((resolve, reject) => {
        let eventSubscription: EventSubscription;
        let timer = setTimeout(
            () => {
                eventSubscription.remove();
                reject(new Error("Timeout."));
            }, 3 * 1000,
        );
        eventSubscription = upstream.addListener(type, safe(logger, async (payload: any) => {
            if (payload.from !== from) {
                return;
            }
            clearTimeout(timer);
            eventSubscription.remove();
            resolve(payload);
        }));
    });
}

function waitEvent<T extends Event>(eventTarget: EventTarget, event: string, func?: Function) {
    return new Promise<T>((resolve, reject) => {
        let timer = setTimeout(
            () => {
                eventTarget.removeEventListener(event, listener);
                reject(new Error("Timeout."));
            }, 3 * 1000,
        );
        let listener = safe(logger, async (e: T) => {
            clearTimeout(timer);
            eventTarget.removeEventListener(event, listener);
            resolve(e);
        });
        eventTarget.addEventListener(event, listener);
        if (func != null) {
            func();
        }
    });
}
