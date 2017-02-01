import { LocalPeer } from "p2pcommunication";

// キューを保持して、必要があれば送ったりする
export default class Peer<T> {
    private p2pPeer: LocalPeer;
    // private eventQueue: T[] = [];

    constructor(url: string) {
        this.p2pPeer = new LocalPeer(url);
        this.p2pPeer.addListener("connected", () => {

        });
    }
}
