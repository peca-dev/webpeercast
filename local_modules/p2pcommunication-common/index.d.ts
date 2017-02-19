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
    onOfferRequesting: Subscribable<OfferRequestData>;
    onSignalingOffer: Subscribable<SignalingOfferData>;
    onSignalingAnswer: Subscribable<SignalingAnswerData>;
    onSignalingIceCandidate: Subscribable<SignalingIceCandidateData>;

    offerTo(to: string, offer: RTCSessionDescriptionInit): void;
    answerTo(to: string, answer: RTCSessionDescriptionInit): void;
    emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidate): void;
}

export interface Downstream<T> extends RemotePeer<T> {
    onOffering: Subscribable<OfferingData>;
    onAnswering: Subscribable<AnsweringData>;
    onIceCandidateEmitting: Subscribable<IceCandidateEmittingData>;

    requestOfferTo(to: string, peerType: PeerType): void;
    signalOffer(from: string, peerType: PeerType, offer: RTCSessionDescriptionInit): void;
    signalAnswer(from: string, answer: RTCSessionDescriptionInit): void;
    signalIceCandidate(from: string, iceCandidate: RTCIceCandidate): void;
}

export type PeerType = "upstream" | "otherStream" | "downstream";
export type OfferRequestData = { to: string, peerType: PeerType };
export type SignalingOfferData = { from: string, peerType: PeerType, offer: RTCSessionDescriptionInit };
export type SignalingAnswerData = { from: string, answer: RTCSessionDescriptionInit };
export type SignalingIceCandidateData = { from: string, iceCandidate: RTCIceCandidateInit };
export type OfferingData = { to: string, offer: RTCSessionDescriptionInit };
export type AnsweringData = { to: string, answer: RTCSessionDescriptionInit };
export type IceCandidateEmittingData = { to: string, iceCandidate: RTCIceCandidateInit };
