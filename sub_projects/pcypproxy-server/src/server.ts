import * as http from "http";
import { Query, RootServer } from "p2pdatasharing";
import ChannelRepository from "./channelrepository";
import { Channel } from "./channel";

export default class Server {
    private rootServer = new RootServer<Channel>(
        http.createServer((request, response) => {
            response.writeHead(404);
            response.end();
        }),
    );
    private channelRepository = new ChannelRepository();

    constructor() {
        this.channelRepository.on("update", (queries: ReadonlyArray<Query<Channel>>) => {
            this.rootServer.pushAll(queries);
        });
    }
}
