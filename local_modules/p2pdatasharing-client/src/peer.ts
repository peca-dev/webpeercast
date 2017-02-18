import * as Rx from "rxjs";
import * as description from "../";
import { LocalPeer } from "p2pcommunication-client";
import { Query } from "./query";

// キューを保持して、必要があれば送ったりする
export default class Peer<T extends { id: string }> implements description.Peer<T> {
    private p2pPeer: LocalPeer<ReadonlyArray<Query<T>>>;
    private eventQueue: Array<Query<T>> = [];

    onUpdated = new Rx.Subject();

    constructor(url: string) {
        this.p2pPeer = new LocalPeer(url);
        this.p2pPeer.onBroadcastReceived.subscribe(data => {
            this.eventQueue.push(
                ...(data.map(x => ({
                    type: x.type,
                    date: new Date(<any>x.date),
                    payload: x.payload,
                }))),
            );
            this.onUpdated.next();
        });
    }

    disconnect() {
        this.p2pPeer.disconnect();
    }

    set(date: Date, payload: T) {
        this.p2pPeer.broadcast([{ type: "set", date, payload }]);
    }

    delete(date: Date, id: string) {
        this.p2pPeer.broadcast([{ type: "delete", date, payload: <T>{ id } }]);
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
