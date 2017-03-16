import { Subject } from 'rxjs';
import { Subscribable } from 'rxjs/Observable';

export function provideConnection(
  offerer: Downstream<{}>,
  stream: 'toOtherStreamOf' | 'toDownstreamOf',
  answerer: Downstream<{}>,
): Promise<void>;

export declare class LocalPeer<T> {
  readonly upstreams: Set<Upstream<T>>;
  readonly otherStreams: Set<RemotePeer<T>>;
  readonly downstreams: Set<Downstream<T>>;

  readonly onConnected: Subject<{ peerType: PeerType; remotePeer: RemotePeer<T>; }>;
  readonly onBroadcastReceived: Subject<T>;

  constructor(downstreamsLimit: number);

  setOtherStreamEventsTo(otherStream: RemotePeer<T>): void;
  addNewOtherStream(otherStream: RemotePeer<T>): void;
  addNewDownstream(downstream: Downstream<T>): Promise<void>;
  broadcast(payload: T): void;
}

export declare class RemotePeer<T> {
  readonly onClosed: Subscribable<ErrorEvent>;
  readonly onIdCreated: Subscribable<string>;
  readonly onOfferRequesting: Subscribable<OfferRequestData>;
  readonly onSignalingOffer: Subscribable<SignalingOfferData>;
  readonly onSignalingAnswer: Subscribable<SignalingAnswerData>;
  readonly onSignalingIceCandidate: Subscribable<SignalingIceCandidateData>;
  readonly onOffering: Subscribable<OfferingData>;
  readonly onAnswering: Subscribable<AnsweringData>;
  readonly onIceCandidateEmitting: Subscribable<IceCandidateEmittingData>;
  readonly onBroadcasting: Subscribable<T>;

  constructor(
    public readonly id: string,
    connection: Connection,
  );

  disconnect(): void;

  offerTo(to: string, offer: RTCSessionDescriptionInit): void;
  answerTo(to: string, answer: RTCSessionDescriptionInit): void;
  emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidate): void;
  requestOffer(to: string, peerType: PeerType): void;
  signalOffer(from: string, peerType: PeerType, offer: RTCSessionDescriptionInit): void;
  signalAnswer(from: string, answer: RTCSessionDescriptionInit): void;
  signalIceCandidate(from: string, iceCandidate: RTCIceCandidateInit): void;
  broadcast(payload: T): void;
}

export interface Broadcastable<T> {
  readonly onBroadcasting: Subscribable<T>;

  broadcast(payload: T);
}

export interface Upstream<T> extends Broadcastable<T> {
  readonly id: string;

  readonly onOfferRequesting: Subscribable<OfferRequestData>;
  readonly onSignalingOffer: Subscribable<SignalingOfferData>;
  readonly onSignalingAnswer: Subscribable<SignalingAnswerData>;
  readonly onSignalingIceCandidate: Subscribable<SignalingIceCandidateData>;

  offerTo(to: string, offer: RTCSessionDescriptionInit): void;
  answerTo(to: string, answer: RTCSessionDescriptionInit): void;
  emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidateInit): void;
}

export interface Downstream<T> extends Broadcastable<T> {
  readonly id: string;

  readonly onOffering: Subscribable<OfferingData>;
  readonly onAnswering: Subscribable<AnsweringData>;
  readonly onIceCandidateEmitting: Subscribable<IceCandidateEmittingData>;

  requestOffer(to: string, peerType: PeerType): void;
  signalOffer(from: string, peerType: PeerType, offer: RTCSessionDescriptionInit): void;
  signalAnswer(from: string, answer: RTCSessionDescriptionInit): void;
  signalIceCandidate(from: string, iceCandidate: RTCIceCandidateInit): void;
}

export interface Connection {
  readonly message: Subscribable<{ type: string, payload: any }>;
  readonly error: Subscribable<Error>;
  readonly closed: Subscribable<{}>;

  close(): void;
  send(type: string, payload: {}): void;
}

export type PeerType = "upstream" | "otherStream" | "downstream";
export type OfferRequestData = { to: string, peerType: PeerType };
export type SignalingOfferData = { from: string, peerType: PeerType, offer: RTCSessionDescriptionInit };
export type SignalingAnswerData = { from: string, answer: RTCSessionDescriptionInit };
export type SignalingIceCandidateData = { from: string, iceCandidate: RTCIceCandidateInit };
export type OfferingData = { to: string, offer: RTCSessionDescriptionInit };
export type AnsweringData = { to: string, answer: RTCSessionDescriptionInit };
export type IceCandidateEmittingData = { to: string, iceCandidate: RTCIceCandidateInit };
