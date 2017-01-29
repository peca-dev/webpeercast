import { EventSubscription } from "fbemitter";

export interface Upstream {
    send(obj: { type: string, payload: Object }): void;
    addListener(
        eventType: string,
        listener: (payload: any) => void,
        context?: any,
    ): EventSubscription;
}
