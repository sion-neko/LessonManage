const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

function parse(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 例：11/17（月） */
export function fmtDate(ymd: string) {
  const d = parse(ymd);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
}

/** 例：2026/11/16（月） */
export function fmtDateLong(ymd: string) {
  const d = parse(ymd);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
}

/** 今日の日付（端末の時刻で YYYY-MM-DD） */
export function todayYmd() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
