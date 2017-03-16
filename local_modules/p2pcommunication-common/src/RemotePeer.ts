import * as Rx from 'rxjs';
import {
  AnsweringData,
  Connection,
  Downstream,
  IceCandidateEmittingData,
  OfferingData,
  OfferRequestData,
  PeerType,
  RemotePeer as IRemotePeer,
  SignalingAnswerData,
  SignalingIceCandidateData,
  SignalingOfferData,
  Upstream,
} from '../';

export default class RemotePeer<T>
  implements IRemotePeer<T>, Upstream<T>, Downstream<T> {

  readonly onClosed: Rx.Observable<ErrorEvent>;
  readonly onIdCreated = new Rx.Subject<string>();
  readonly onOfferRequesting = new Rx.Subject<OfferRequestData>();
  readonly onSignalingOffer = new Rx.Subject<SignalingOfferData>();
  readonly onSignalingAnswer = new Rx.Subject<SignalingAnswerData>();
  readonly onSignalingIceCandidate = new Rx.Subject<SignalingIceCandidateData>();
  readonly onOffering = new Rx.Subject<OfferingData>();
  readonly onAnswering = new Rx.Subject<AnsweringData>();
  readonly onIceCandidateEmitting = new Rx.Subject<IceCandidateEmittingData>();
  readonly onBroadcasting = new Rx.Subject<T>();

  constructor(
    public readonly id: string,
    private readonly connection: Connection,
  ) {
    this.connection.message.subscribe(({ type, payload }) => {
      // TODO: Filter trusted message each connection source
      switch (type) {
        case 'id':
          this.onIdCreated.next(payload);
          break;
        case 'requestOffer':
          this.onOfferRequesting.next(payload);
          break;
        case 'offerToRelaying':
          this.onOffering.next(payload);
          break;
        case 'offerToRelayed':
          this.onSignalingOffer.next(payload);
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
    this.onClosed = <Rx.Observable<ErrorEvent>>this.connection.closed;
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
