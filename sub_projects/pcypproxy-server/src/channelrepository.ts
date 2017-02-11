import { EventEmitter } from "events";
import fetch from "node-fetch";
import { Query } from "p2pdatasharing";
import { Channel, parse } from "peercast-yp-channels-parser";
import { getLogger } from "log4js";
const logger = getLogger(__filename);

// let TP_OSHIRASE = "TPからのお知らせ◆お知らせ";
// let TP_UPLOAD = "Temporary yellow Pages◆アップロード帯域";

export default class ChannelRepository extends EventEmitter {
    private date = new Date(0);
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
        let {channels: nowChannels, date: nowDate} = await fetchChannels();
        let { deleteList, setList }
            = getDiffList(this.channels, this.date, nowChannels, nowDate);
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
    oldDate: Date,
    now: Channel[],
    nowDate: Date,
) {
    return {
        deleteList: old.filter(x => now.every(y => x.id !== y.id)),
        setList: now.filter(x => old.every(
            y => !deepEqualOrNearCreatedAt(x, nowDate, y, oldDate),
        )), // include updates
    };
}

async function fetchChannels() {
    let channels = <Channel[]>[];
    let res = await fetch("http://temp.orz.hm/yp/index.txt");
    let date = new Date();
    channels = channels.concat(parse(await res.text()));
    return { channels, date };
}

function deepEqualOrNearCreatedAt(
    a: Channel,
    aDate: Date,
    b: Channel,
    bDate: Date,
) {
    if (
        a.name !== b.name ||
        a.id !== b.id ||
        a.ip !== b.ip ||
        a.url !== b.url ||
        a.genre !== b.genre ||
        a.desc !== b.desc ||
        a.bandType !== b.bandType ||
        a.listeners !== b.listeners ||
        a.relays !== b.relays ||
        a.bitrate !== b.bitrate ||
        a.type !== b.type ||
        a.track.creator !== b.track.creator ||
        a.track.album !== b.track.album ||
        a.track.title !== b.track.title ||
        a.track.url !== b.track.url ||
        // uptime isn't checked.
        a.comment !== b.comment ||
        a.direct !== b.direct
    ) {
        return false;
    }
    // difference of 2 minutes or more
    if (
        Math.abs(aDate.getTime() - a.uptime - (bDate.getTime() - b.uptime))
        > 2 * 60 * 1000
    ) {
        return false;
    }
    return true;
}
