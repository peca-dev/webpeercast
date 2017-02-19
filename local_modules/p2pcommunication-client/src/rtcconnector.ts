import { safe } from "./printerror";
import { AnonymousSubscription } from "rxjs/Subscription";
import {
    RemotePeer,
    IceCandidateData,
    Subscribable,
} from "p2pcommunication-common";

export function createDataChannel(pc: RTCPeerConnection, to: string, upstream: RemotePeer<{}>) {
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

async function exchangeOfferWithAnswer(pc: RTCPeerConnection, to: string, upstream: RemotePeer<{}>) {
    let offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    upstream.send({
        type: "receiveRTCOffer",
        payload: { to, offer },
    });
    let payload = await waitMessage(upstream.onAnswering, to);
    await pc.setRemoteDescription(payload.answer);
}

export function fetchDataChannel(
    pc: RTCPeerConnection,
    from: string,
    offer: RTCSessionDescriptionInit,
    upstream: RemotePeer<{}>,
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
    upstream: RemotePeer<{}>,
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
    upstream: RemotePeer<{}>,
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
    let subscription = upstream.onIceCandidateEmitting.subscribe(safe(async (payload: IceCandidateData) => {
        if (payload.from !== to) {
            return;
        }
        pc.addIceCandidate(payload.iceCandidate);
        subscription.unsubscribe();
    }));
    try {
        return await func();
    } finally {
        pc.removeEventListener("icecandidate", iceCandidateListener);
        subscription.unsubscribe();
    }
}

function waitMessage(observable: Subscribable<{ from: string }>, from: string) {
    return new Promise<any>((resolve, reject) => {
        let subscription: AnonymousSubscription;
        let timer = setTimeout(
            () => {
                subscription.unsubscribe();
                reject(new Error("Timeout."));
            }, 3 * 1000,
        );
        subscription = observable.subscribe(safe(async (payload: { from: string }) => {
            if (payload.from !== from) {
                return;
            }
            clearTimeout(timer);
            subscription.unsubscribe();
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
        let listener = safe(async (e: T) => {
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
