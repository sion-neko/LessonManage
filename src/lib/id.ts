/** 端末の中だけで使う ID。時刻と乱数から作る */
export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
