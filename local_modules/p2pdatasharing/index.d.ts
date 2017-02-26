import * as http from 'http';
import { Query } from './src/Query';

export declare class RootServer<T extends { id: string }> {
    constructor(httpServer: http.Server);
    pushAll(queries: ReadonlyArray<Query<T>>): void;
}

export type Query<T> = Query<T>;
