try { require("source-map-support").install(); } catch (e) { /* empty */ }
import RootServer from "./rootserver";

async function main() {
    new RootServer(); // tslint:disable-line no-unused-new
}

main().catch(e => console.error(e.stack || e));
