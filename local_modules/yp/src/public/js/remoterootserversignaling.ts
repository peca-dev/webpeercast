export default class RemoteRootServerSignal {
    // private async receiveMessage(e: MessageEvent) {
    //     let data = JSON.parse(e.data);
    //     switch (data.type) {
    //         case "id":
    //             logger.debug("id", data.payload);
    //             this.id = data.payload;
    //             break;
    //         case "makeRTCOffer":
    //             let to = data.payload;
    //             if (to == null) {
    //                 throw new Error("Payload is null.");
    //             }
    //             this.makeRTCOffer(to);
    //             break;
    //         case "receiveRTCOffer":
    //             let answer = await this.receiveRTCOffer(
    //                 data.payload.from,
    //                 data.payload.offer,
    //             );
    //             logger.debug("send receiveAnswer");
    //             this.socket.send(JSON.stringify({
    //                 type: "receiveRTCAnswer",
    //                 payload: {
    //                     to: data.payload.from,
    //                     answer,
    //                 },
    //             }));
    //             break;
    //         case "receiveRTCAnswer":
    //             logger.debug("receiveRTCAnswer");
    //             await this.receiveRTCAnswer(
    //                 data.payload.from,
    //                 data.payload.answer,
    //             );
    //             break;
    //         case "receiveIceCandidate":
    //             logger.debug("receiveIceCandidate");
    //             await this.receiveIceCandidate(
    //                 data.payload.from,
    //                 data.payload.iceCandidate,
    //             );
    //             break;
    //         default:
    //             throw new Error("Unsupported data type: " + data.type);
    //     }
    // }
}
