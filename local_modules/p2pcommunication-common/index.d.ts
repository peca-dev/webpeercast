import { Subscribable } from "rxjs/Observable";
export { Subscribable }

export interface RemotePeer<T> {
    readonly id: string;

    onClosed: Subscribable<{}>;
    onBroadcasting: Subscribable<T>;

    disconnect(): void;
    broadcast(payload: T);
}

export interface Upstream<T> extends RemotePeer<T> {
    onOfferRequesting: Subscribable<string>;
    onSignalingOffer: Subscribable<SignalingOfferData>;
    onSignalingAnswer: Subscribable<SignalingAnswerData>;
    onSignalingIceCandidate: Subscribable<SignalingIceCandidateData>;

    offer(to: string, offer: RTCSessionDescriptionInit): void;
    answer(to: string, answer: RTCSessionDescriptionInit): void;
    emitIceCandidate(to: string, iceCandidate: RTCIceCandidate): void;
}

export interface Downstream<T> extends RemotePeer<T> {
    onOffering: Subscribable<SignalingOfferData>;
    onAnswering: Subscribable<SignalingAnswerData>;
    onIceCandidateEmitting: Subscribable<SignalingIceCandidateData>;

    requestOffer(to: string): void;
    signalOffer(from: string, offer: RTCSessionDescriptionInit): void;
    signalAnswer(from: string, answer: RTCSessionDescriptionInit): void;
    signalIceCandidate(from: string, iceCandidate: RTCIceCandidate): void;
}

export type SignalingOfferData = { from: string, offer: RTCSessionDescriptionInit };
export type SignalingAnswerData = { from: string, answer: RTCSessionDescriptionInit };
export type SignalingIceCandidateData = { from: string, iceCandidate: RTCIceCandidateInit };
export type OfferingData = { to: string, offer: RTCSessionDescriptionInit };
export type AnsweringData = { to: string, answer: RTCSessionDescriptionInit };
export type IceCandidateEmittingData = { to: string, iceCandidate: RTCIceCandidateInit };
