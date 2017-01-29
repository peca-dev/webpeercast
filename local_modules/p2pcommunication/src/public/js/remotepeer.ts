import { EventSubscription } from "fbemitter";

export interface RemotePeer {
    send(obj: { type: string, payload: Object }): void;
    addListener(
        eventType: string,
        listener: (payload: any) => void,
        context?: any,
    ): EventSubscription;
}
