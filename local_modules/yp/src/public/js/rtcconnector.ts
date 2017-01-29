import { EventSubscription } from "fbemitter";
import * as log4js from "log4js";
const getLogger = (<typeof log4js>require("log4js2")).getLogger;
import { safe } from "./printerror";
import { Upstream } from "./upstream";
const logger = getLogger(__filename);

export function createDataChannel(pc: RTCPeerConnection, to: string, upstream: Upstream) {
    return exchangeIceCandidate(pc, to, upstream, async () => {
        let dataChannel: RTCDataChannel | null = null;
        await waitEvent(pc, "negotiationneeded", () => {
            dataChannel = pc.createDataChannel("");
        });
        await exchangeOfferWithAnswer(pc, to, upstream);
        await waitEvent(dataChannel!, "open");
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
    let payload = await waitMessage(upstream, "receiveRTCAnswer", to);
    await pc.setRemoteDescription(payload.answer);
}

export function fetchDataChannel(
    pc: RTCPeerConnection,
    from: string,
    offer: RTCSessionDescriptionInit,
    upstream: Upstream,
) {
    return exchangeIceCandidate(pc, from, upstream, async () => {
        await exchangeAnswerWithOffer(pc, from, offer, upstream);
        let event: RTCDataChannelEvent = <any>await waitEvent(pc, "datachannel");
        await waitEvent(event.channel, "open");
        return event.channel;
    });
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
