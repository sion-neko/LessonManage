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
