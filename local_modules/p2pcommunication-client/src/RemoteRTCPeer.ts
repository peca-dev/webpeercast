import * as debugStatic from 'debug';
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

declare const __filename: string;
debugStatic.enable(__filename);
const debug = debugStatic(__filename);

export default class RemoteRTCPeer<T> implements RemotePeer<T>, Upstream<T>, Downstream<T> {
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
    dataChannel.addEventListener('message', (message: MessageEvent) => {
      try {
        switch (message.type) {
          case 'message':
            const obj = JSON.parse(message.data);
            switch (obj.type) {
              case 'makeRTCOffer':
                this.onOfferRequesting.next(obj.payload);
                break;
              case 'receiveRTCOffer': // TODO: choose different names the climb and the desent
                this.onOffering.next(obj.payload);
                this.onSignalingOffer.next(obj.payload);
                break;
              case 'receiveRTCAnswer':
                this.onAnswering.next(obj.payload);
                this.onSignalingAnswer.next(obj.payload);
                break;
              case 'receiveIceCandidate':
                this.onIceCandidateEmitting.next(obj.payload);
                this.onSignalingIceCandidate.next(obj.payload);
                break;
              case 'broadcast':
                this.onBroadcasting.next(obj.payload);
                break;
              default:
                throw new Error('Unsupported data type: ' + obj.type);
            }
            break;
          default:
            throw new Error('Unsupported message type: ' + message.type);
        }
      } catch (e) {
        debug(e);
      }
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
    this.dataChannel.send(JSON.stringify({
      type: 'receiveRTCOffer',
      payload: { to, offer },
    }));
  }

  answerTo(to: string, answer: RTCSessionDescriptionInit) {
    this.dataChannel.send(JSON.stringify({
      type: 'receiveRTCAnswer',
      payload: { to, answer },
    }));
  }

  emitIceCandidateTo(to: string, iceCandidate: RTCIceCandidate) {
    this.dataChannel.send(JSON.stringify({
      type: 'receiveIceCandidate',
      payload: { to, iceCandidate },
    }));
  }

  requestOffer(to: string, peerType: PeerType) {
    this.dataChannel.send(JSON.stringify({
      type: 'makeRTCOffer',
      payload: { to, peerType },
    }));
  }

  signalOffer(from: string, peerType: PeerType, offer: RTCSessionDescriptionInit) {
    this.dataChannel.send(JSON.stringify({
      type: 'receiveRTCOffer',
      payload: { from, peerType, offer },
    }));
  }

  signalAnswer(from: string, answer: RTCSessionDescriptionInit) {
    this.dataChannel.send(JSON.stringify({
      type: 'receiveRTCAnswer',
      payload: { from, answer },
    }));
  }

  signalIceCandidate(from: string, iceCandidate: RTCIceCandidateInit) {
    this.dataChannel.send(JSON.stringify({
      type: 'receiveIceCandidate',
      payload: { from, iceCandidate },
    }));
  }

  broadcast(payload: T) {
    this.dataChannel.send(JSON.stringify({ type: 'broadcast', payload }));
  }
}
