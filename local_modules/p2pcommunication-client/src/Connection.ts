import { Observable } from 'rxjs';

export interface Connection {
  readonly message: Observable<{ type: string, payload: any }>;
  readonly error: Observable<ErrorEvent>;
  readonly closed: Observable<ErrorEvent>;

  close(): void;
  send(type: string, payload: {}): void;
}
