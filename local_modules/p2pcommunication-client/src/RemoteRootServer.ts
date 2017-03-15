import {
  OfferRequestData,
  SignalingAnswerData,
  SignalingIceCandidateData,
  SignalingOfferData,
  Upstream,
} from 'p2pcommunication-common';
import * as Rx from 'rxjs';
import { printError } from './printerror';
import WebSocketConnection from './WebSocketConnection';

export default class RemoteRootServer<T> implements Upstream<T> {
  readonly id = '00000000-0000-0000-0000-000000000000';

  onClosed: Rx.Observable<ErrorEvent>;
  onIdCreated = new Rx.Subject<string>();
  onOfferRequesting = new Rx.Subject<OfferRequestData>();
  onSignalingOffer = new Rx.Subject<SignalingOfferData>();
  onSignalingAnswer = new Rx.Subject<SignalingAnswerData>();
  onSignalingIceCandidate = new Rx.Subject<SignalingIceCandidateData>();
  onBroadcasting = new Rx.Subject<T>();

  constructor(private readonly connection: WebSocketConnection) {
    this.connection.message.subscribe(({ type, payload }) => {
      switch (type) {
        case 'id':
          this.onIdCreated.next(payload);
          break;
        case 'requestOffer':
          this.onOfferRequesting.next(payload);
          break;
        case 'offerToRelayed':
          this.onSignalingOffer.next(payload);
          break;
        case 'answerToRelayed':
          this.onSignalingAnswer.next(payload);
          break;
        case 'emitIceCandidateToRelayed':
          this.onSignalingIceCandidate.next(payload);
          break;
        case 'broadcast':
          this.onBroadcasting.next(payload);
          break;
        default:
          throw new Error(`Unsupported data type: ${type}`);
      }
    });
    this.connection.error.subscribe(printError);
    this.onClosed = this.connection.closed;
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

  broadcast(payload: T) {
    this.connection.send('broadcast', payload);
  }

  disconnect() {
    this.connection.close();
  }
}
