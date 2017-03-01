export interface Query<T extends { id: string }> {
  type: 'set' | 'delete';
  date: Date;
  payload: T;
}
