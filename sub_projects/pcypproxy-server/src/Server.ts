import * as http from 'http';
import { getLogger } from 'log4js';
import { Query, RootServer } from 'p2pdatasharing';
import { Channel } from 'peercast-yp-channels-parser';
import ChannelRepository from './ChannelRepository';
const logger = getLogger(__filename);

export default class Server {
    private httpServer = http.createServer((request, response) => {
        response.writeHead(404);
        response.end();
    });
    private rootServer = new RootServer<Channel>(this.httpServer);

    private channelRepository = new ChannelRepository();

    constructor() {
        this.channelRepository.on('update', (queries: ReadonlyArray<Query<Channel>>) => {
            this.rootServer.pushAll(queries);
        });
        this.httpServer.listen(8080, () => {
            logger.info((new Date()) + ' Server is listening on port 8080');
        });
    }
}
