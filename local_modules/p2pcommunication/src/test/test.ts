try { require('source-map-support').install(); } catch (e) { /* empty */ }
polyfill();
import * as debugStatic from 'debug';
debugStatic.enable('p2pcommunication:*');

import { createServer } from './server';

let server: { close(): void };

before(async () => { server = await createServer(); });
after(() => { server.close(); });

import './connection';
import './sharing';

function polyfill() {
  const electronWebrtc = require('electron-webrtc-patched')();
  (<any>global).RTCIceCandidate = electronWebrtc.RTCIceCandidate;
  (<any>global).RTCPeerConnection = electronWebrtc.RTCPeerConnection;
  (<any>global).RTCSessionDescription = electronWebrtc.RTCSessionDescription;
  (<any>global).fetch = require('node-fetch');
  (<any>global).WebSocket = require('ws');
}
