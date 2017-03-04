import {
  AnsweringData,
  Downstream,
  IceCandidateEmittingData,
  OfferingData,
  OfferRequestData,
  PeerType,
  RemotePeer,
  SignalingAnswerData,
  SignalingIceCandidateData,
  SignalingOfferData,
  Upstream,
} from 'p2pcommunication-common';
import * as Rx from 'rxjs';

export default class RTCRemotePeer<T> implements RemotePeer<T>, Upstream<T>, Downstream<T> {
  onClosed = new Rx.Subject();
  onOfferRequesting = new Rx.Subject<OfferRequestData>();
  onSignalingOffer = new Rx.Subject<SignalingOfferData>();
  onSignalingAnswer = new Rx.Subject<SignalingAnswerData>();
  onSignalingIceCandidate = new Rx.Subject<SignalingIceCandidateData>();
  onOffering = new Rx.Subject<OfferingData>();
  onAnswering = new Rx.Subject<AnsweringData>();
  onIceCandidateEmitting = new Rx.Subject<IceCandidateEmittingData>();
  onBroadcasting = new Rx.Subject<T>();

  constructor(
    public readonly id: string,
    private peerConnection: RTCPeerConnection,
    private dataChannel: RTCDataChannel,
  ) {
    dataChannel.addEventListener('message', (e: MessageEvent) => {
      if (e.type !== 'message') {
        throw new Error(`Unsupported message type: ${e.type}`);
      }
      const data = JSON.parse(e.data);
      if (data.type !== 'broadcast') {
        throw new Error(`Unsupported data type: ${e.type}`);
      }
      this.onBroadcasting.next(data.payload);
    });
    dataChannel.addEventListener('error', (e: ErrorEvent) => {
      console.error(e);
    });
    dataChannel.addEventListener('close', (e: Event) => {
      this.onClosed.next();
      this.onClosed.complete();
    });
  }

  disconnect() {
    this.dataChannel.close();
    this.peerConnection.close();
  }

  offerTo(to: string, offer: RTCSessionDescriptionInit) {
    throw new Error('Not implemented yet.');
  }

  answerTo(to: string, answer: RTCSessionDescriptionInit) {
    throw new Error('Not implemented yet.');
  }

  emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidate) {
    throw new Error('Not implemented yet.');
  }

  requestOffer(to: string, peerType: PeerType) {
    throw new Error('Not implemented yet.');
  }

  signalOffer(from: string, peerType: PeerType, offer: RTCSessionDescriptionInit) {
    throw new Error('Not implemented yet.');
  }

  signalAnswer(from: string, answer: RTCSessionDescriptionInit) {
    throw new Error('Not implemented yet.');
  }

  signalIceCandidate(from: string, iceCandidate: RTCIceCandidateInit) {
    throw new Error('Not implemented yet.');
  }

  broadcast(payload: T) {
    this.dataChannel.send(JSON.stringify({ type: 'broadcast', payload }));
  }
}
