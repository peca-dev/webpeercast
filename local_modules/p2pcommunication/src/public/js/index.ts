import LocalPeer from "./localpeer";

async function main() {
    new LocalPeer("ws://localhost:8080"); // tslint:disable-line:no-unused-new
}

main();
