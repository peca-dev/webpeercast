import { Observable } from 'rxjs';

export default class RemoteRootServer<T> {
  readonly signaling: Observable<T>;
}
