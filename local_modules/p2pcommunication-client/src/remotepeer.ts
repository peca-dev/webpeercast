import * as Rx from "rxjs";

export interface RemotePeer<T> {
    readonly id: string;

    onClosed: Rx.Observable<{}>;
    onOfferRequesting: Rx.Observable<string>;
    onOffering: Rx.Observable<RTCOfferData>;
    onAnswering: Rx.Observable<RTCAnswerData>;
    onIceCandidateEmitting: Rx.Observable<IceCandidateData>;
    onBroadcasting: Rx.Observable<T>;

    send(obj: { type: string, payload: Object }): void;
    disconnect(): void;
}

export type RTCOfferData = { from: string, offer: RTCSessionDescriptionInit };
export type RTCAnswerData = { from: string, answer: RTCSessionDescriptionInit };
export type IceCandidateData = { from: string, iceCandidate: RTCIceCandidateInit };
