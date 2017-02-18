import { ipcRenderer } from "electron";
import { Peer } from "p2pdatasharing-client";
import { Channel } from "peercast-yp-channels-parser";

export default class YPPeer {
    private peer: Peer<Channel>;

    constructor(url: string) {
        this.peer = new Peer<Channel>(url);
        this.peer.onUpdated.subscribe(() => {
            ipcRenderer.send("update", this.peer.getAll());
        });
    }
}
