import type { Lesson } from '@/data/types';

// チャプター：レッスン録音をトピックごとの区間に分ける。
// 区間は、時間が付いた行のトピックから作る。再生画面で「この時間からのトピック」を選び直したところ（chapterCuts）が優先

type Point = { at: number; topicKey: string | null; manual: boolean };

function points(l: Lesson): Point[] {
  return l.learned
    .filter((n) => n.at != null)
    .map((n) => ({ at: n.at as number, topicKey: n.topicKey, manual: false }))
    .concat(l.chapterCuts.map((c) => ({ at: c.at, topicKey: c.topicKey, manual: true })))
    .sort((a, b) => a.at - b.at || Number(a.manual) - Number(b.manual));
}

/** その時間のトピック（なければ null＝トピックなし） */
export function chapterAt(l: Lesson, t: number): string | null {
  const ps = points(l);
  if (!ps.length) return null;
  let key = ps[0].topicKey;
  for (const p of ps) if (p.at <= t) key = p.topicKey;
  return key;
}

export type Segment = { from: number; to: number; topicKey: string | null };

/** 区間の一覧。同じトピックが続くところは1つにまとめる */
export function chapterSegments(l: Lesson, duration: number): Segment[] {
  const ps = points(l);
  if (!ps.length) return [{ from: 0, to: duration, topicKey: null }];
  const segs: Segment[] = [];
  ps.forEach((p, i) => {
    const last = segs[segs.length - 1];
    if (last && last.topicKey === p.topicKey) return;
    const from = i === 0 ? 0 : p.at;
    if (last) last.to = from;
    segs.push({ from, to: duration, topicKey: p.topicKey });
  });
  return segs;
}

/** 録音ごとに決まった形の、見た目だけの波形（0〜1）。本物の音の形ではない */
export function fakeWave(id: string, n: number): number[] {
  let x = 0;
  for (const c of id) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    out.push(0.25 + (x % 75) / 100);
  }
  return out;
}
