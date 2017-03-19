try { require('source-map-support').install(); } catch (e) { /* empty */ }

polyfill();

import './connection';

function polyfill() {
  const electronWebrtc = require('electron-webrtc-patched')();
  (<any>global).RTCIceCandidate = electronWebrtc.RTCIceCandidate;
  (<any>global).RTCPeerConnection = electronWebrtc.RTCPeerConnection;
  (<any>global).RTCSessionDescription = electronWebrtc.RTCSessionDescription;
  (<any>global).fetch = require('node-fetch');
  (<any>global).WebSocket = require('ws');
}
