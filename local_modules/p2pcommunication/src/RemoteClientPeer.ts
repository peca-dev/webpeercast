import * as debugStatic from 'debug';
import {
  AnsweringData,
  Downstream,
  IceCandidateEmittingData,
  OfferingData,
  PeerType,
} from 'p2pcommunication-common';
import * as Rx from 'rxjs';
import * as uuid from 'uuid';
import { connection as WebSocketConnection } from 'websocket';
import * as declaration from '../index';
import ServerWebSocketConnection from './ServerWebSocketConnection';

const debug = debugStatic('p2pcommunication:RemoteClient');

export default class RemoteClientPeer<T> implements declaration.RemoteClient<T>, Downstream<T> {
  readonly id = uuid.v4();
  private readonly connection: ServerWebSocketConnection;

  onClosed = new Rx.Subject<{}>();
  onOffering = new Rx.Subject<OfferingData>();
  onAnswering = new Rx.Subject<AnsweringData>();
  onIceCandidateEmitting = new Rx.Subject<IceCandidateEmittingData>();
  onBroadcasting = new Rx.Subject<T>();

  constructor(connection: WebSocketConnection) {
    this.connection = new ServerWebSocketConnection(connection);
    debug('new peer', this.id);
    this.connection.send('id', this.id);
    this.connection.message.subscribe(({type, payload}) => {
      switch (type) {
        case 'offerToRelaying':
          this.onOffering.next(payload);
          break;
        case 'answerToRelaying':
          this.onAnswering.next(payload);
          break;
        case 'emitIceCandidateToRelayling':
          this.onIceCandidateEmitting.next(payload);
          break;
        case 'broadcast':
          this.onBroadcasting.next(payload);
          break;
        default:
          throw new Error('Unsupported data type: ' + type);
      }
    });
    this.onClosed = this.connection.closed;
  }

  disconnect() {
    this.connection.close();
  }

  requestOffer(to: string, peerType: PeerType) {
    this.connection.send('requestOffer', { to, peerType });
  }

  signalOffer(from: string, peerType: PeerType, offer: {}) {
    this.connection.send('offerToRelayed', { from, peerType, offer });
  }

  signalAnswer(from: string, answer: {}) {
    this.connection.send('answerToRelayed', { from, answer });
  }

  signalIceCandidate(from: string, iceCandidate: {}) {
    this.connection.send('emitIceCandidateToRelayed', { from, iceCandidate });
  }

  broadcast(payload: T) {
    this.connection.send('broadcast', payload);
  }
}
