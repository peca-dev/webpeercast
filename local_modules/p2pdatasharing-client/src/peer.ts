import { EventEmitter } from "fbemitter";
import { LocalPeer } from "p2pcommunication-client";
import { Query } from "./query";

// キューを保持して、必要があれば送ったりする
export default class Peer<T extends { id: string }> extends EventEmitter {
    private p2pPeer: LocalPeer;
    private eventQueue: Array<Query<T>> = [];

    constructor(url: string) {
        super();

        this.p2pPeer = new LocalPeer(url);
        this.p2pPeer.addListener("broadcast", (data: Array<Query<T>>) => {
            this.eventQueue.push(...data);
            this.emit("update");
        });
    }

    set(date: Date, data: T) {
        this.p2pPeer.broadcast([{ type: "set", date, data }]);
    }

    delete(date: Date, id: string) {
        this.p2pPeer.broadcast([{ type: "delete", date, data: { id } }]);
    }

    getAll() {
        let map = new Map<string, T>();
        for (let datum of this.eventQueue.concat().sort(asc)) {
            switch (datum.type) {
                case "set":
                    map.set(datum.payload.id, datum.payload);
                    break;
                case "delete":
                    map.delete(datum.payload.id);
                    break;
                default:
                    throw new Error("Unsupported type.");
            }
        }
        return Array.from(map.values());
    }
}

function asc(a: Query<any>, b: Query<any>) {
    let aTime = a.date.getTime();
    let bTime = b.date.getTime();
    return aTime < bTime ? -1
        : aTime > bTime ? 1
            : 0;
}