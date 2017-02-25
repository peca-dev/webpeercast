try { require('source-map-support').install(); } catch (e) { /* empty */ } // tslint:disable-line:no-var-requires no-require-imports
import { app, BrowserWindow, ipcMain } from 'electron';
import * as log4js from 'log4js';
import ChannelsServer from './ChannelsServer';

log4js.configure({
    appenders: [{ type: 'console', layout: { type: 'basic' } }]
});

async function main() {
    await new Promise((resolve, reject) => app.once('ready', resolve));
    app.on('window-all-closed', app.quit.bind(app));
    const win = new BrowserWindow({
        width: 0,
        height: 0,
        show: false
    });
    win.loadURL(`file://${__dirname}/public/index.html`);
    const server = new ChannelsServer(8081);
    ipcMain.on('update', (e, channels) => {
        server.channels = channels;
    });
}

main().catch(e => log4js.getLogger().error(e.stack || e));
