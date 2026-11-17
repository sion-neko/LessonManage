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
      { id: 'r2', kind: 'practice', lessonId: 'L1', songId: 's1', date: '2026-11-16', dur: 200, note: '移動は親指から。まだ音程が上ずる' },
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
    lessonsOf: (typeId) => S.lessons.filter((l) => l.typeId === typeId).sort(byDateDesc),
    latest: (typeId) => D.lessonsOf(typeId)[0] || null,
    lessonRec: (lessonId) => S.recs.find((r) => r.kind === 'lesson' && r.lessonId === lessonId) || null,
    practiceOf: (lessonId) => S.recs.filter((r) => r.kind === 'practice' && r.lessonId === lessonId).sort(byDateAsc),
    recsOfSong: (songId) => S.recs.filter((r) => r.songId === songId).sort(byDateDesc),
    lessonsOfSong: (songId) => S.lessons.filter((l) => l.songIds.includes(songId)).sort(byDateDesc),
    memosOf: (songId) => S.memos.filter((m) => m.songId === songId).sort(byDateDesc),
    songsOf: (typeId) => S.songs.filter((s) => s.typeId === typeId),
    allRecs: () => S.recs.slice().sort(byDateDesc),
    lastActivity(songId) {
      const ds = [...D.recsOfSong(songId), ...D.memosOf(songId)].map((x) => x.date).sort();
      return ds[ds.length - 1] || null;
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
    addSong(typeId, title, sub) { const s = { id: nid('s'), typeId, title, sub: sub || '' }; S.songs.push(s); return s; },
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
    addRec(o) { const r = Object.assign({ id: nid('r'), date: TODAY, note: '', songId: null, lessonId: null }, o); S.recs.push(r); return r; },
    addMemo(songId, text) { if (!text.trim()) return null; const m = { id: nid('m'), songId, date: TODAY, text: text.trim() }; S.memos.push(m); return m; },

    fmtDate(d, withYear) {
      const [y, m, dd] = d.split('-').map(Number);
      const w = '日月火水木金土'[new Date(y, m - 1, dd).getDay()];
      return (withYear ? y + '/' : '') + m + '/' + dd + '（' + w + '）';
    },
    md(d) { const [, m, dd] = d.split('-').map(Number); return m + '/' + dd; },
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

  // 疑似再生
  const Play = {
    id: null, pos: 0, timer: null, listeners: new Set(),
    toggle(rec) {
      if (Play.id === rec.id) { Play.stop(); return; }
      Play.stop(); Play.id = rec.id; Play.pos = 0; Play.len = rec.dur;
      Play.timer = setInterval(() => { Play.pos += 1; if (Play.pos >= Play.len) Play.stop(); Play.emit(); }, 1000);
      Play.emit();
    },
    stop() { clearInterval(Play.timer); Play.id = null; Play.pos = 0; Play.emit(); },
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
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet-bg"></div><div class="sheet"><div class="sheet-grip"></div><div class="sheet-body"></div></div>';
    host.appendChild(wrap);
    const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 380); opts.onClose && opts.onClose(); };
    wrap.querySelector('.sheet-bg').addEventListener('click', () => { if (!opts.modal) close(); });
    build(wrap.querySelector('.sheet-body'), close);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('in')));
    return close;
  }

  function toast(host, text) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; host.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, 1600);
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

  window.LM = { D, Rec, Play, makeNav, sheet, toast, esc, h, I, wave };
})();
