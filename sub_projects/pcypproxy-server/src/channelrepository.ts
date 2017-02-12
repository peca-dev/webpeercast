import { EventEmitter } from "events";
import fetch from "node-fetch";
import { Query } from "p2pdatasharing";
import { Channel, parse } from "peercast-yp-channels-parser";
import { getLogger } from "log4js";
const logger = getLogger(__filename);

// let TP_OSHIRASE = "TPからのお知らせ◆お知らせ";
// let TP_UPLOAD = "Temporary yellow Pages◆アップロード帯域";

export default class ChannelRepository extends EventEmitter {
    private channels = <Channel[]>[];

    constructor() {
        super();

        setInterval(
            async () => {
                try {
                    this.update();
                } catch (e) {
                    logger.error(e);
                }
            },
            10 * 1000,
        );
    }

    private async update() {
        let nowChannels = await fetchChannels();
        let { deleteList, setList }
            = getDiffList(this.channels, nowChannels);
        let now = new Date();
        this.emit(
            "update",
            setList
                .map(x => <Query<Channel>>{
                    type: "set",
                    date: now,
                    payload: x,
                })
                .concat(deleteList.map(x => <Query<Channel>>{
                    type: "delete",
                    date: now,
                    payload: x,
                })),
        );
    }
}

function getDiffList(
    old: Channel[],
    now: Channel[],
) {
    return {
        deleteList: old.filter(x => now.every(y => x.id !== y.id)),
        setList: now.filter(x => old.every(
            y => !deepEqualOrNearCreatedAt(x, y),
        )), // include updates
    };
}

async function fetchChannels() {
    let channels = <Channel[]>[];
    let res = await fetch("http://temp.orz.hm/yp/index.txt");
    let now = new Date();
    return channels.concat(parse(await res.text(), now));
}

function deepEqualOrNearCreatedAt(
    a: Channel,
    b: Channel,
) {
    if (
        a.name !== b.name ||
        a.id !== b.id ||
        a.ip !== b.ip ||
        a.url !== b.url ||
        a.genre !== b.genre ||
        a.desc !== b.desc ||
        a.bandwidthType !== b.bandwidthType ||
        a.listeners !== b.listeners ||
        a.relays !== b.relays ||
        a.bitrate !== b.bitrate ||
        a.type !== b.type ||
        a.track.creator !== b.track.creator ||
        a.track.album !== b.track.album ||
        a.track.title !== b.track.title ||
        a.track.url !== b.track.url ||
        // createdAt isn't checked.
        a.comment !== b.comment ||
        a.direct !== b.direct
    ) {
        return false;
    }
    // difference of 2 minutes or more
    if (
        Math.abs(a.createdAt - b.createdAt)
        > 2 * 60 * 1000
    ) {
        return false;
    }
    return true;
}
