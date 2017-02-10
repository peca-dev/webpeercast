export interface Channel {
    readonly name: string;
    readonly id: string;
    readonly ip: string;
    readonly url: string;
    readonly genre: string;
    readonly desc: string;
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
    readonly bandType: string;
    readonly yp: string;
}
