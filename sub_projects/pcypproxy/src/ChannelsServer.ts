import * as http from 'http';
import { Channel, stringify } from 'peercast-yp-channels-parser';

export default class ChannelsServer {
    channels = <Channel[]>[];
    date = new Date(0);

    constructor(port: number) {
        http.createServer(
            (request, response) => {
                if (request.method !== 'GET' || request.url !== '/index.txt') {
                    response.writeHead(404);
                    response.end();
                    return;
                }
                response.writeHead(
                    200,
                    { 'Content-Type': 'text/plain; charset=UTF-8' }
                );
                response.end(stringify(this.channels, new Date()));
            }
        ).listen(port);
    }
}
