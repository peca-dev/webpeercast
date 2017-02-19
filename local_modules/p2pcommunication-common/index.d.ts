import { Subscribable } from "rxjs/Observable";
export { Subscribable }

export interface RemotePeer<T> {
    readonly id: string;

    onClosed: Subscribable<{}>;
    onBroadcasting: Subscribable<T>;

    send(obj: { type: string, payload: Object }): void;
    disconnect(): void;
}

export interface Upstream<T> extends RemotePeer<T> {
    onOfferRequesting: Subscribable<string>;
    onOfferingFromOther: Subscribable<RTCOfferData>;
    onAnsweringFromOther: Subscribable<RTCAnswerData>;
    onIceCandidateEmittingFromOther: Subscribable<IceCandidateData>;
}

export interface Downstream<T> extends RemotePeer<T> {
    onOfferingToOther: Subscribable<RTCOfferData>;
    onAnsweringToOther: Subscribable<RTCAnswerData>;
    onIceCandidateEmittingToOther: Subscribable<IceCandidateData>;
}

export type RTCOfferData = { from: string, offer: RTCSessionDescriptionInit };
export type RTCAnswerData = { from: string, answer: RTCSessionDescriptionInit };
export type IceCandidateData = { from: string, iceCandidate: RTCIceCandidateInit };
