try { require('source-map-support').install(); } catch (e) { /* empty */ } // tslint:disable-line:no-var-requires no-require-imports
import * as http from 'http';
import { getLogger } from 'log4js';
import { Query } from './Query';
import RootServer from './server/RootServer';
const logger = getLogger();

const debug = process.env.NODE_ENV === 'development';

async function main() {
    let server: RootServer<any>;
    const httpServer = http.createServer((request, response) => {
        if (debug) {
            if (request.url === '/clear') {
                (<any>server).eventQueue.length = 0;
                response.setHeader('Access-Control-Allow-Origin', '*');
                response.writeHead(200);
                response.end();
                return;
            }
            if (request.method === 'POST') {
                request.addListener('readable', () => {
                    const data = request.read(parseInt(request.headers['Content-Length'], 10));
                    if (data == null) {
                        return;
                    }
                    server.pushAll(
                        (<ReadonlyArray<any>>JSON.parse(data))
                            .map(x => <Query<any>>{ type: 'set', date: new Date(), payload: x })
                    );
                    response.setHeader('Access-Control-Allow-Origin', '*');
                    response.writeHead(200);
                    response.end();
                });
                return;
            }
        }
        logger.info((new Date()) + ' Received request for ' + request.url + ', ' + request.method);
        response.writeHead(404);
        response.end();
    });
    server = new RootServer<any>(httpServer);
    httpServer.listen(8080, () => {
        logger.info((new Date()) + ' Server is listening on port 8080');
    });
}

main().catch(e => console.error(e.stack || e));
