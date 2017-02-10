import { EventEmitter } from "events";
import fetch from "node-fetch";
import * as deepEquals from "deep-equal";
import { Query } from "p2pdatasharing";
import { Channel } from "./channel";
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
                    let nowChannels = await fetchChannels();
                    let { deleteList, setList } = getDiffList(this.channels, nowChannels);
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
                } catch (e) {
                    logger.error(e);
                }
            },
            10 * 1000,
        );
    }
}

function getDiffList(old: Channel[], now: Channel[]) {
    return {
        deleteList: old.filter(x => now.every(y => x.id !== y.id)),
        setList: now.filter(x => old.every(y => !deepEquals(x, y))), // include updates
    };
}

async function fetchChannels() {
    let channels = <Channel[]>[];
    channels = channels.concat(parseIndexTxt(
        await (await fetch("http://temp.orz.hm/yp/index.txt")).text(),
        "TP",
    ));
    return channels;
}

function parseIndexTxt(body: string, yp: string) {
    return body.trim().split("\n")
        .map(line => line.split("<>"))
        .map(entries => entries.map(unescapeSpecialLetters))
        .map(entries => {
            let {desc, bandType} = parseDescAndBandType(entries[5]);
            return <Channel>{
                name: entries[0],
                id: entries[1],
                ip: entries[2],
                url: entries[3],
                genre: entries[4],
                desc,
                listeners: parseInt(entries[6], 10),
                relays: parseInt(entries[7], 10),
                bitrate: parseInt(entries[8], 10),
                type: entries[9],
                track: {
                    creator: entries[10],
                    album: entries[11],
                    title: entries[12],
                    url: entries[13],
                },
                uptimeMinutes: hoursMinToMin(entries[15]),
                comment: entries[17],
                direct: entries[18] === "1",
                bandType,
                yp,
            };
        });
}

function parseDescAndBandType(fullDesc: string) {
    let r = fullDesc.match(/(?: - )?<(.*)>$/);
    if (r == null) {
        return {
            desc: fullDesc,
            bandType: "",
        };
    }
    return {
        desc: fullDesc.substring(0, r.index),
        bandType: r[1],
    };
}

function hoursMinToMin(hmm: string) {
    let nums = hmm.split(":").map(x => parseInt(x, 10));
    return nums[0] * 60 + nums[1];
}

function unescapeSpecialLetters(str: string) {
    return str.replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&");
}
