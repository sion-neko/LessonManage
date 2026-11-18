// LessonManage プロトタイプ共通部分：サンプルデータ・データ操作・録音の疑似動作・画面遷移
(function () {
  const TODAY = '2026-11-17';

  const seed = {
    types: [
      { id: 't1', name: 'バイオリン', teacher: 'ブライアン先生' },
      { id: 't2', name: 'ボイトレ', teacher: '駅前ボイス教室' },
    ],
    songs: [
      { id: 's1', typeId: 't1', title: 'ヴィヴァルディ 協奏曲 イ短調', sub: '第1楽章' },
      { id: 's2', typeId: 't1', title: 'カイザー 練習曲', sub: '8番' },
      { id: 's3', typeId: 't1', title: 'スケール', sub: '3オクターブ' },
      { id: 's4', typeId: 't1', title: '第九', sub: '精華オケ 2nd' },
      { id: 's5', typeId: 't2', title: 'Lemon', sub: '米津玄師' },
      { id: 's6', typeId: 't2', title: 'マリーゴールド', sub: 'あいみょん' },
    ],
    lessons: [
      { id: 'L1', typeId: 't1', date: '2026-11-16', songIds: ['s1', 's3'],
        learned: ['弓を返すときに手首を固めない', '3ポジへの移動は親指を先に動かす', '20小節目からは弓を多めに使ってフレーズを大きく'],
        homework: ['ヴィヴァルディ 20〜36小節をゆっくり', 'スケールは3オクターブをテンポ60で'] },
      { id: 'L2', typeId: 't1', date: '2026-11-09', songIds: ['s1', 's2'],
        learned: ['冒頭の付点はもっと軽く', '開放弦に逃げずに4の指で取る'],
        homework: ['ヴィヴァルディ 冒頭〜19小節', 'カイザー8番 前半をテンポ72で'] },
      { id: 'L3', typeId: 't1', date: '2026-11-02', songIds: ['s2'],
        learned: ['移弦は肘の高さから先に変える'],
        homework: ['カイザー8番 移弦の箇所だけ取り出して'] },
      { id: 'L4', typeId: 't2', date: '2026-11-12', songIds: ['s5'],
        learned: ['高音は喉で押さずに息の量で出す', 'サビ前のブレスを半拍早めに'],
        homework: ['リップロールで音階 5分', 'Lemonのサビを録って聞き返す'] },
      { id: 'L5', typeId: 't2', date: '2026-10-29', songIds: ['s5', 's6'],
        learned: ['語尾を投げずに最後まで息を流す'],
        homework: ['マリーゴールド Aメロを語りかけるように'] },
    ],
    recs: [
      { id: 'r1', kind: 'lesson', lessonId: 'L1', songId: null, date: '2026-11-16', dur: 2772, note: '' },
      { id: 'r2', kind: 'practice', lessonId: 'L1', songId: 's1', date: '2026-11-16', dur: 200, note: '移動は親指から。まだ音程が上ずる', marks: [{ at: 95, text: '移動のあとの音程が上ずる' }] },
      { id: 'r3', kind: 'lesson', lessonId: 'L2', songId: null, date: '2026-11-09', dur: 2690, note: '' },
      { id: 'r4', kind: 'practice', lessonId: 'L2', songId: 's1', date: '2026-11-11', dur: 165, note: '付点は軽くなってきた' },
      { id: 'r5', kind: 'practice', lessonId: 'L2', songId: 's2', date: '2026-11-13', dur: 230, note: 'テンポ72はまだ崩れる' },
      { id: 'r6', kind: 'lesson', lessonId: 'L4', songId: null, date: '2026-11-12', dur: 3010, note: '' },
      { id: 'r7', kind: 'practice', lessonId: 'L4', songId: 's5', date: '2026-11-14', dur: 252, note: 'サビの高音が少し楽に' },
      { id: 'r8', kind: 'song', lessonId: null, songId: 's4', date: '2026-11-15', dur: 610, note: 'オケ前に通し' },
      { id: 'r9', kind: 'lesson', lessonId: 'L5', songId: null, date: '2026-10-29', dur: 2880, note: '' },
      { id: 'r10', kind: 'lesson', lessonId: 'L3', songId: null, date: '2026-11-02', dur: 2705, note: '' },
    ],
    memos: [
      { id: 'm1', songId: 's1', date: '2026-10-26', text: '1楽章を始めた。テンポ♩=80から' },
      { id: 'm2', songId: 's1', date: '2026-11-02', text: '冒頭の付点はもっと軽く（先生）' },
      { id: 'm3', songId: 's1', date: '2026-11-09', text: '20小節目以降で弓が足りなくなる。配分を考える' },
      { id: 'm4', songId: 's1', date: '2026-11-16', text: 'ポジション移動は親指を先に。手首は固めない' },
      { id: 'm5', songId: 's5', date: '2026-11-12', text: 'サビの「〜ままで」は息の量で出す' },
      { id: 'm6', songId: 's4', date: '2026-11-15', text: '練習記号Gからの刻みが走る' },
      { id: 'm7', songId: 's2', date: '2026-11-09', text: 'テンポ72が目標' },
    ],
    // 次のレッスンで聞くこと（フォルダごと。聞けたら消す）
    asks: [
      { id: 'a1', typeId: 't1', songId: 's1', date: '2026-11-17', text: '20小節目からの弓順はこれで合っている？' },
    ],
  };

  const S = JSON.parse(JSON.stringify(seed));
  let seq = 100;
  const nid = (p) => p + (++seq);

  const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const byDateAsc = (a, b) => -byDateDesc(a, b);

  const D = {
    S, TODAY,
    type: (id) => S.types.find((t) => t.id === id),
    song: (id) => S.songs.find((s) => s.id === id),
    lesson: (id) => S.lessons.find((l) => l.id === id),
    // 新しい順。同じ日付なら後に作った方を先に（S.lessons は作った順に並ぶ）
    lessonsOf: (typeId) => S.lessons.filter((l) => l.typeId === typeId).sort((a, b) => byDateDesc(a, b) || S.lessons.indexOf(b) - S.lessons.indexOf(a)),
    // 直近のレッスン：日付がいちばん新しいレッスン。同じ日付なら後に作った方（ホーム・前回の宿題・聞くことの欄・曲ページから録る録音と取り込みの既定がこれで決まる）
    latest: (typeId) => D.lessonsOf(typeId)[0] || null,
    // 録音の日付：レッスン録音はレッスンの日付。個人練は録った日（取り込みはファイルの日付）、ただしレッスンより前ならレッスンの日付。レッスンと関係ない録音は録った日
    // raw：録った日（取り込みはファイルの日付）。録音を直すシートでレッスンを変えたときも、これから決め直す
    recDate(kind, lessonId, raw) { const l = lessonId && D.lesson(lessonId); if (!l) return raw; if (kind === 'lesson') return l.date; return raw < l.date ? l.date : raw; },
    lessonRec: (lessonId) => S.recs.find((r) => r.kind === 'lesson' && r.lessonId === lessonId) || null,
    practiceOf: (lessonId) => S.recs.filter((r) => r.kind === 'practice' && r.lessonId === lessonId).sort(byDateAsc),
    recsOfSong: (songId) => S.recs.filter((r) => r.songId === songId).sort(byDateDesc),
    lessonsOfSong: (songId) => S.lessons.filter((l) => l.songIds.includes(songId)).sort(byDateDesc),
    memosOf: (songId) => S.memos.filter((m) => m.songId === songId).sort(byDateDesc),
    songsOf: (typeId) => S.songs.filter((s) => s.typeId === typeId),
    allRecs: () => S.recs.slice().sort(byDateDesc),
    // 曲の最近の動き：録音・メモ・扱ったレッスン・曲を作った日のうち、いちばん新しい日
    lastActivity(songId) {
      const s = D.song(songId);
      const ds = [...D.recsOfSong(songId), ...D.memosOf(songId), ...D.lessonsOfSong(songId)].map((x) => x.date).concat(s && s.created ? [s.created] : []).sort();
      return ds[ds.length - 1] || null;
    },
    // 曲を最近の動きの新しい順に（動きが同じ日・どちらもないときは作った順）
    songsByActivity(typeId) {
      const ss = D.songsOf(typeId); const la = new Map(ss.map((s) => [s, D.lastActivity(s.id) || '']));
      return ss.map((s, i) => [s, i]).sort((a, b) => (la.get(a[0]) < la.get(b[0]) ? 1 : la.get(a[0]) > la.get(b[0]) ? -1 : a[1] - b[1])).map((x) => x[0]);
    },
    // 長い一覧（10曲以上）では、3か月（90日）動きのない曲を「ほかの曲（N）」に畳む。9曲までは1画面に収まるので畳まない
    FOLD_MIN: 10, FOLD_DAYS: 90,
    foldSongs(typeId) {
      const all = D.songsByActivity(typeId);
      if (all.length < D.FOLD_MIN) return { recent: all, old: [] };
      const lim = new Date(TODAY); lim.setDate(lim.getDate() - D.FOLD_DAYS); const ls = lim.toISOString().slice(0, 10);
      const isOld = (s) => (D.lastActivity(s.id) || '') < ls;
      return { recent: all.filter((s) => !isOld(s)), old: all.filter(isOld) };
    },
    // 時系列（曲ページ用）：メモ・録音・レッスンをまとめて新しい順
    songTimeline(songId) {
      const items = [
        ...D.memosOf(songId).map((m) => ({ t: 'memo', date: m.date, m })),
        ...D.recsOfSong(songId).map((r) => ({ t: 'rec', date: r.date, r })),
        ...D.lessonsOfSong(songId).map((l) => ({ t: 'lesson', date: l.date, l })),
      ];
      const order = { lesson: 0, memo: 1, rec: 2 };
      return items.sort((a, b) => byDateDesc(a, b) || order[a.t] - order[b.t]);
    },

    addType(name, teacher) { const t = { id: nid('t'), name, teacher: teacher || '' }; S.types.push(t); return t; },
    addSong(typeId, title, sub) { const s = { id: nid('s'), typeId, title, sub: sub || '', created: TODAY }; S.songs.push(s); return s; },
    // 同じフォルダの、同じ名前の曲（全角半角・大文字小文字・空白の違いは同じとみなす）
    // except：名前を変えるときの、その曲自身（自分と同じ名前は「同じ名前の曲」としない）
    findSong(typeId, title, except) { const k = (t) => String(t).normalize('NFKC').replace(/\s+/g, '').toLowerCase(); return S.songs.find((s) => s !== except && s.typeId === typeId && k(s.title) === k(title)) || null; },
    // 曲を作る入口はすべてこれを通す。同じ名前の曲があれば作らずにその曲を返す（existed: true）。録音やメモが2つの曲ページに分かれないように
    songByName(typeId, title, sub) { const f = this.findSong(typeId, title); return f ? { song: f, existed: true } : { song: this.addSong(typeId, title, sub), existed: false }; },
    addLesson(typeId) {
      const l = { id: nid('L'), typeId, date: TODAY, songIds: [], learned: [], homework: [] };
      S.lessons.push(l); return l;
    },
    addBullet(lessonId, field, text) { if (text.trim()) D.lesson(lessonId)[field].push(text.trim()); },
    removeBullet(lessonId, field, i) { D.lesson(lessonId)[field].splice(i, 1); },
    toggleSong(lessonId, songId) {
      const l = D.lesson(lessonId); const i = l.songIds.indexOf(songId);
      if (i >= 0) l.songIds.splice(i, 1); else l.songIds.push(songId);
    },
    addRec(o) { const r = Object.assign({ id: nid('r'), date: TODAY, note: '', songId: null, lessonId: null }, o); if (!r.raw) r.raw = r.date; r.date = D.recDate(r.kind, r.lessonId, r.raw); S.recs.push(r); return r; },
    asksOf: (typeId) => S.asks.filter((a) => a.typeId === typeId),
    // lessonId：書いたレッスン（そのレッスンのページ・その後の個人練から書いたとき）。レッスンをほかのフォルダへ移すとき一緒に移す
    addAsk(typeId, songId, text, lessonId) { if (!text.trim()) return null; const a = { id: nid('a'), typeId, songId: songId || null, date: TODAY, text: text.trim(), lessonId: lessonId || null }; S.asks.push(a); return a; },
    removeAsk(id) { const i = S.asks.findIndex((a) => a.id === id); if (i >= 0) S.asks.splice(i, 1); },
    addMemo(songId, text) { if (!text.trim()) return null; const m = { id: nid('m'), songId, date: TODAY, text: text.trim() }; S.memos.push(m); return m; },

    // 日付の書き方（全画面で共通）：今年の日付は「11/17」、今年でない日付は「2025/11/24」のように年をつける
    fmtDate(d) {
      const [y, m, dd] = d.split('-').map(Number);
      const w = '日月火水木金土'[new Date(y, m - 1, dd).getDay()];
      return D.md(d) + '（' + w + '）';
    },
    md(d) { const [y, m, dd] = d.split('-').map(Number); return (String(y) === TODAY.slice(0, 4) ? '' : y + '/') + m + '/' + dd; },
    // 月の見出し：今年は「10月」、今年でなければ「2025年12月」
    ym(d) { const [y, m] = d.split('-').map(Number); return (String(y) === TODAY.slice(0, 4) ? '' : y + '年') + m + '月'; },
    // 合計時間：「1時間17分」「45分」
    hm(sec) { const m = Math.round(sec / 60); if (!m) return '1分未満'; return (m >= 60 ? Math.floor(m / 60) + '時間' : '') + (m % 60 || m < 60 ? (m % 60) + '分' : ''); },
    rel(d) {
      const ms = new Date(TODAY) - new Date(d); const n = Math.round(ms / 86400000);
      if (n === 0) return '今日'; if (n === 1) return '昨日'; if (n < 7) return n + '日前';
      if (n < 31) return Math.floor(n / 7) + '週間前'; return D.md(d);
    },
    dur(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + String(s).padStart(2, '0'); },
  };

  // 録音の疑似動作（実際には録音しない）。経過時間だけ進める
  const Rec = {
    on: false, sec: 0, timer: null, ctx: null, listeners: new Set(),
    start(ctx) {
      if (Rec.on) return; Rec.on = true; Rec.sec = 0; Rec.ctx = ctx || {};
      Rec.timer = setInterval(() => { Rec.sec += 1; Rec.emit(); }, 1000 / (window.__recSpeed || 1));
      Rec.emit();
    },
    stop() {
      if (!Rec.on) return null; clearInterval(Rec.timer); Rec.on = false;
      const out = { dur: Math.max(Rec.sec, 1), ctx: Rec.ctx }; Rec.sec = 0; Rec.ctx = null; Rec.emit(); return out;
    },
    sub(fn) { Rec.listeners.add(fn); return () => Rec.listeners.delete(fn); },
    emit() { Rec.listeners.forEach((f) => f(Rec)); },
  };

  // 疑似再生。一時停止しても位置を保つ。速度・5秒戻る/進むつき
  const Play = {
    id: null, rec: null, pos: 0, len: 0, rate: 1, paused: false, timer: null, listeners: new Set(),
    RATES: [0.5, 0.75, 1, 1.25, 1.5],
    open(rec, pos) {
      clearInterval(Play.timer); Play.id = rec.id; Play.rec = rec; Play.len = rec.dur;
      Play.pos = Math.max(0, Math.min(pos || 0, rec.dur - 1)); Play.run();
    },
    run() {
      clearInterval(Play.timer); Play.paused = false;
      Play.timer = setInterval(() => { Play.pos = Math.min(Play.len, Play.pos + 0.25 * Play.rate * (window.__playSpeed || 1)); if (Play.pos >= Play.len) Play.pause(); else Play.emit(); }, 250);
      Play.emit();
    },
    pause() { clearInterval(Play.timer); Play.timer = null; Play.paused = true; Play.emit(); },
    resume() { if (!Play.id) return; if (Play.pos >= Play.len) Play.pos = 0; Play.run(); },
    // 同じ録音なら一時停止／再開、別の録音なら頭から
    toggle(rec) { if (Play.id === rec.id) { if (Play.paused) Play.resume(); else Play.pause(); return; } Play.open(rec, 0); },
    seek(d) { if (!Play.id) return; Play.pos = Math.max(0, Math.min(Play.len, Play.pos + d)); Play.emit(); },
    seekTo(p) { if (!Play.id) return; Play.pos = Math.max(0, Math.min(Play.len, p)); Play.emit(); },
    nextRate() { const i = Play.RATES.indexOf(Play.rate); Play.rate = Play.RATES[(i + 1) % Play.RATES.length]; Play.emit(); },
    stop() { clearInterval(Play.timer); Play.timer = null; Play.id = null; Play.rec = null; Play.pos = 0; Play.paused = false; Play.emit(); },
    sub(fn) { Play.listeners.add(fn); return () => Play.listeners.delete(fn); },
    emit() { Play.listeners.forEach((f) => f(Play)); },
  };

  // 画面遷移（スタック）。遷移はゆっくりめのフェード
  function makeNav(root, screens) {
    const stack = [];
    let busy = false;
    function mount(entry, dir) {
      const el = document.createElement('div');
      el.className = 'screen';
      el.dataset.screen = entry.name;
      root.appendChild(el);
      entry.el = el;
      renderEntry(entry);
      el.classList.add(dir === 'back' ? 'enter-back' : 'enter');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
      return el;
    }
    function renderEntry(entry) {
      const scroll = entry.el.querySelector('.scroll');
      const top = scroll ? scroll.scrollTop : 0;
      entry.el.innerHTML = '';
      screens[entry.name](entry.el, entry.args || {}, nav);
      const s2 = entry.el.querySelector('.scroll');
      if (s2) s2.scrollTop = top;
    }
    function leave(entry, dir) {
      const el = entry.el; el.classList.remove('in'); el.classList.add(dir === 'back' ? 'leave-back' : 'leave');
      setTimeout(() => el.remove(), 380);
    }
    const nav = {
      push(name, args) {
        if (busy) return; busy = true; setTimeout(() => (busy = false), 380);
        const cur = stack[stack.length - 1]; if (cur) leave(cur, 'fwd');
        const e = { name, args }; stack.push(e); mount(e, 'fwd');
      },
      replace(name, args) {
        const cur = stack.pop(); if (cur) leave(cur, 'fwd');
        const e = { name, args }; stack.push(e); mount(e, 'fwd');
      },
      back() {
        if (stack.length < 2 || busy) return; busy = true; setTimeout(() => (busy = false), 380);
        const cur = stack.pop(); leave(cur, 'back');
        const prev = stack[stack.length - 1]; mount(prev, 'back');
      },
      root(name, args) {
        while (stack.length) { const e = stack.pop(); e.el && e.el.remove(); }
        const e = { name, args }; stack.push(e); mount(e, 'fwd');
      },
      refresh() { const cur = stack[stack.length - 1]; if (cur) renderEntry(cur); },
      get depth() { return stack.length; },
      get current() { return stack[stack.length - 1]; },
    };
    return nav;
  }

  // ボトムシート
  function sheet(host, build, opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap' + (opts.center ? ' center' : '');
    wrap.innerHTML = '<div class="sheet-bg"></div><div class="sheet"><div class="sheet-grip"></div><div class="sheet-body"></div></div>';
    host.appendChild(wrap);
    const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 380); opts.onClose && opts.onClose(); };
    wrap.querySelector('.sheet-bg').addEventListener('click', () => { if (!opts.modal) close(); });
    build(wrap.querySelector('.sheet-body'), close);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('in')));
    return close;
  }

  // act：{ label, fn } を渡すと、短い通知に「取り消す」などのボタンを添える（少し長めに出す）
  function toast(host, text, act) {
    if (act) host.querySelectorAll('.toast.act').forEach((x) => x.remove()); // 取り消せるのは最後の1つだけ
    const t = document.createElement('div'); t.className = 'toast' + (act ? ' act' : ''); t.textContent = text; host.appendChild(t);
    const hide = () => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); };
    if (act) { const b = document.createElement('button'); b.textContent = act.label; b.onclick = () => { hide(); act.fn(); }; t.appendChild(b); }
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
    setTimeout(hide, act ? 4000 : 1600);
  }

  // 長い名前を詰める（通知・追加欄の薄い字など、名前を短く出すところで共通）。12文字までならそのまま
  // 似た名前（ヴィヴァルディ イ短調 第1楽章／第3楽章）を見分けられるよう、前だけでなく後ろも残す（「ヴィヴァルディ…第3楽章」）
  // 後ろは、空白で区切った最後の言葉が5文字までならその言葉、ほかは最後の4文字。前は残りの字数で、言葉の途中で切れるときは空白まで戻す
  const SHORT_MAX = 12;
  function short(name) {
    const t = String(name).trim(); const cs = [...t]; if (cs.length <= SHORT_MAX) return t;
    const ws = t.split(/\s+/); const last = [...ws[ws.length - 1]];
    const tail = (ws.length > 1 && last.length <= 5 ? last.join('') : cs.slice(-4).join('').replace(/^[\s・･、。,.\-ー]+/, ''));
    const n = SHORT_MAX - 1 - [...tail].length; let head = cs.slice(0, n).join('');
    if (cs[n] && !/\s/.test(cs[n])) { const i = head.search(/\s\S*$/); if (i >= 3) head = head.slice(0, i); } // 言葉の途中で切れるときは空白まで戻す
    head = head.trim();
    return head + '…' + tail;
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  // アイコン（線のSVG）
  const I = {
    back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></svg>',
    list: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    compose: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    back5: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><text x="12" y="15.5" font-size="8" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,sans-serif">5</text></svg>',
    fwd5: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/><text x="12" y="15.5" font-size="8" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,sans-serif">5</text></svg>',
    x: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  // 疑似波形（録音IDから決まった形）
  function wave(id, bars, cls) {
    let x = 0; for (const c of String(id)) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    let out = '<span class="wave ' + (cls || '') + '">';
    for (let i = 0; i < bars; i++) { x = (x * 1103515245 + 12345) >>> 0; const v = 25 + (x % 75); out += '<i style="height:' + v + '%"></i>'; }
    return out + '</span>';
  }

  // タップ数の計測（検証用）
  window.__taps = 0;
  document.addEventListener('click', (e) => { if (e.target.closest('button, a, [data-tap], input, textarea, label')) window.__taps++; }, true);

  window.LM = { D, Rec, Play, makeNav, sheet, toast, esc, h, I, wave, short };
})();
