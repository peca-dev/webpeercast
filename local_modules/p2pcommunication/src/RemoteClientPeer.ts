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

const debug = debugStatic('p2pcommunication:RemoteClient');

export default class RemoteClientPeer<T> implements declaration.RemoteClient<T>, Downstream<T> {
  readonly id = uuid.v4();

  onClosed = new Rx.Subject<{}>();
  onOffering = new Rx.Subject<OfferingData>();
  onAnswering = new Rx.Subject<AnsweringData>();
  onIceCandidateEmitting = new Rx.Subject<IceCandidateEmittingData>();
  onBroadcasting = new Rx.Subject<T>();

  constructor(public connection: WebSocketConnection) {
    debug('new peer', this.id);
    connection.send(JSON.stringify({
      type: 'id',
      payload: this.id,
    }));
    connection.on('message', (message) => {
      try {
        switch (message.type) {
          case 'utf8':
            const obj = JSON.parse(message.utf8Data!);
            switch (obj.type) {
              case 'offerToRelaying':
                this.onOffering.next(obj.payload);
                break;
              case 'answerToRelaying':
                this.onAnswering.next(obj.payload);
                break;
              case 'emitIceCandidateToRelayling':
                this.onIceCandidateEmitting.next(obj.payload);
                break;
              case 'broadcast':
                this.onBroadcasting.next(obj.payload);
                break;
              default:
                throw new Error('Unsupported data type: ' + obj.type);
            }
            break;
          case 'binary':
            debug('Received Binary Message of ' + message.binaryData!.length + ' bytes');
            throw new Error('Unsupported data type.');
          default:
            throw new Error('Unsupported message type: ' + message.type);
        }
      } catch (e) {
        console.error(e.stack || e);
      }
    });
    connection.on('close', (reasonCode, description) => {
      this.onClosed.next({ reasonCode, description });
      this.onClosed.complete();
    });
  }

  disconnect() {
    throw new Error('Not implemented.');
  }

  requestOffer(to: string, peerType: PeerType) {
    this.connection.send(JSON.stringify({
      type: 'requestOffer',
      payload: { to, peerType },
    }));
  }

  signalOffer(from: string, peerType: PeerType, offer: {}) {
    this.connection.send(JSON.stringify({
      type: 'offerToRelayed',
      payload: { from, peerType, offer },
    }));
  }

  signalAnswer(from: string, answer: {}) {
    this.connection.send(JSON.stringify({
      type: 'answerToRelayed',
      payload: { from, answer },
    }));
  }

  signalIceCandidate(from: string, iceCandidate: {}) {
    this.connection.send(JSON.stringify({
      type: 'emitIceCandidateToRelayed',
      payload: { from, iceCandidate },
    }));
  }

  broadcast(payload: T) {
    this.connection.send(JSON.stringify({
      type: 'broadcast',
      payload,
    }));
  }
}
