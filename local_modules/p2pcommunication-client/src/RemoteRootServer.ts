import {
  OfferRequestData,
  SignalingAnswerData,
  SignalingIceCandidateData,
  SignalingOfferData,
  Upstream,
} from 'p2pcommunication-common';
import * as Rx from 'rxjs';
import { printError, safe } from './printerror';

export default class RemoteRootServer<T> implements Upstream<T> {
  readonly id = '00000000-0000-0000-0000-000000000000';

  onClosed = new Rx.Subject();
  onIdCreated = new Rx.Subject<string>();
  onOfferRequesting = new Rx.Subject<OfferRequestData>();
  onSignalingOffer = new Rx.Subject<SignalingOfferData>();
  onSignalingAnswer = new Rx.Subject<SignalingAnswerData>();
  onSignalingIceCandidate = new Rx.Subject<SignalingIceCandidateData>();
  onBroadcasting = new Rx.Subject<T>();

  constructor(public socket: WebSocket) {
    this.socket.addEventListener('message', safe(async (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      switch (data.type) {
        case 'id':
          this.onIdCreated.next(data.payload);
          break;
        case 'requestOffer':
          this.onOfferRequesting.next(data.payload);
          break;
        case 'offerToRelayed':
          this.onSignalingOffer.next(data.payload);
          break;
        case 'receiveRTCAnswer':
          this.onSignalingAnswer.next(data.payload);
          break;
        case 'receiveIceCandidate':
          this.onSignalingIceCandidate.next(data.payload);
          break;
        case 'broadcast':
          this.onBroadcasting.next(data.payload);
          break;
        default:
          throw new Error(`Unsupported data type: ${data}`);
      }
    }));
    this.socket.addEventListener('error', printError);
    this.socket.addEventListener('close', (e) => {
      this.onClosed.next();
      this.onClosed.complete();
    });
  }

  offerTo(to: string, offer: RTCSessionDescriptionInit) {
    this.socket.send(JSON.stringify({
      type: 'offerToRelaying',
      payload: { to, offer },
    }));
  }

  answerTo(to: string, answer: RTCSessionDescriptionInit) {
    this.socket.send(JSON.stringify({
      type: 'receiveRTCAnswer',
      payload: { to, answer },
    }));
  }

  emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidate) {
    this.socket.send(JSON.stringify({
      type: 'receiveIceCandidate',
      payload: { to, iceCandidate },
    }));
  }

  broadcast(payload: T) {
    this.socket.send(JSON.stringify({ type: 'broadcast', payload }));
  }

  disconnect() {
    this.socket.close();
  }
}
