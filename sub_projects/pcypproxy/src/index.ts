try { require("source-map-support").install(); } catch (e) { /* empty */ }
import ChannelsServer from "./channelsserver";
import * as log4js from "log4js";
import { app, BrowserWindow } from "electron";

log4js.configure({
    appenders: [{ type: "console", layout: { type: "basic" } }]
});

async function main() {
    await new Promise((resolve, reject) => app.once("ready", resolve));
    app.on("window-all-closed", app.quit.bind(app));
    let win = new BrowserWindow({
        width: 0,
        height: 0,
        show: false,
    });
    win.loadURL(`file://${__dirname}/public/index.html`);
    // tslint:disable-next-line:no-unused-new
    new ChannelsServer(8080);
}

main().catch(e => log4js.getLogger().error(e.stack || e));
