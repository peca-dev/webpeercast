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
import RTCDataChannelConnection from './RTCDataChannelConnection';

export default class RemoteRTCPeer<T> implements RemotePeer<T>, Upstream<T>, Downstream<T> {
  onClosed: Rx.Observable<ErrorEvent>;
  onOfferRequesting = new Rx.Subject<OfferRequestData>();
  onSignalingOffer = new Rx.Subject<SignalingOfferData>();
  onSignalingAnswer = new Rx.Subject<SignalingAnswerData>();
  onSignalingIceCandidate = new Rx.Subject<SignalingIceCandidateData>();
  onOffering = new Rx.Subject<OfferingData>();
  onAnswering = new Rx.Subject<AnsweringData>();
  onIceCandidateEmitting = new Rx.Subject<IceCandidateEmittingData>();
  onBroadcasting = new Rx.Subject<T>();
  private readonly connection: RTCDataChannelConnection;

  constructor(
    public readonly id: string,
    peerConnection: RTCPeerConnection,
    dataChannel: RTCDataChannel,
  ) {
    this.connection = new RTCDataChannelConnection(peerConnection, dataChannel);
    this.connection.message.subscribe(({ type, payload }) => {
      switch (type) {
        case 'requestOffer':
          this.onOfferRequesting.next(payload);
          break;
        case 'offerToRelaying':
          this.onSignalingOffer.next(payload);
          break;
        case 'offerToRelayed':
          this.onOffering.next(payload);
          break;
        case 'answerToRelaying':
          this.onAnswering.next(payload);
          break;
        case 'answerToRelayed':
          this.onSignalingAnswer.next(payload);
          break;
        case 'emitIceCandidateToRelayling':
          this.onIceCandidateEmitting.next(payload);
          break;
        case 'emitIceCandidateToRelayed':
          this.onSignalingIceCandidate.next(payload);
          break;
        case 'broadcast':
          this.onBroadcasting.next(payload);
          break;
        default:
          throw new Error('Unsupported data type: ' + type);
      }
    });
    this.connection.error.subscribe(console.error);
    this.onClosed = this.connection.closed;
  }

  disconnect() {
    this.connection.close();
  }

  offerTo(to: string, offer: RTCSessionDescriptionInit) {
    this.connection.send('offerToRelaying', { to, offer });
  }

  answerTo(to: string, answer: RTCSessionDescriptionInit) {
    this.connection.send('answerToRelaying', { to, answer });
  }

  emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidate) {
    this.connection.send('emitIceCandidateToRelayling', { to, iceCandidate });
  }

  requestOffer(to: string, peerType: PeerType) {
    this.connection.send('requestOffer', { to, peerType });
  }

  signalOffer(from: string, peerType: PeerType, offer: RTCSessionDescriptionInit) {
    this.connection.send('offerToRelayed', { from, peerType, offer });
  }

  signalAnswer(from: string, answer: RTCSessionDescriptionInit) {
    this.connection.send('answerToRelayed', { from, answer });
  }

  signalIceCandidate(from: string, iceCandidate: RTCIceCandidateInit) {
    this.connection.send('emitIceCandidateToRelayed', { from, iceCandidate });
  }

  broadcast(payload: T) {
    this.connection.send('broadcast', payload);
  }
}
