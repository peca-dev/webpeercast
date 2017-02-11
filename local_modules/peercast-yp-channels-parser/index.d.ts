export function stringify(channels: Channel[]): string;
export function parse(body: string): Channel[];

export interface Channel {
    readonly name: string;
    readonly id: string;
    readonly ip: string;
    readonly url: string;
    readonly genre: string;
    readonly desc: string;
    readonly bandType: string;
    readonly listeners: number;
    readonly relays: number;
    readonly bitrate: number;
    readonly type: string;
    readonly track: {
        readonly creator: string;
        readonly album: string;
        readonly title: string;
        readonly url: string;
    };
    readonly createdAt: Date;
    readonly comment: string;
    readonly direct: boolean;
}

export interface MutableChannel extends Channel {
    name: string;
    id: string;
    ip: string;
    url: string;
    genre: string;
    desc: string;
    bandType: string;
    listeners: number;
    relays: number;
    bitrate: number;
    type: string;
    track: {
        creator: string;
        album: string;
        title: string;
        url: string;
    };
    createdAt: Date;
    comment: string;
    direct: boolean;
}
