// 各案で使い回す操作の流れ（録音シート・録音後の紐づけ・種類の選択・箇条書きの入力）
(function () {
  const { D, Rec, sheet, esc, I } = LM;

  // ステータスバー（録音中はダイナミックアイランドに経過時間）
  LM.chrome = function (app, onIsland) {
    const bar = document.createElement('div');
    bar.className = 'statusbar';
    bar.innerHTML = '<span>9:41</span><span class="island"></span><span class="batt"></span>';
    app.appendChild(bar);
    const isl = bar.querySelector('.island');
    isl.style.pointerEvents = 'auto';
    isl.addEventListener('click', () => { if (Rec.on && onIsland) onIsland(); });
    Rec.sub(() => {
      if (Rec.on) { isl.classList.add('rec'); isl.innerHTML = '<span class="dot"></span><span>' + D.dur(Rec.sec) + '</span>'; }
      else { isl.classList.remove('rec'); isl.innerHTML = ''; }
    });
  };

  // 録音シート。minimizable のときは「閉じても録音は続く」
  LM.recordSheet = function (host, o) {
    let closeFn;
    const body = (el, close) => {
      closeFn = close;
      el.innerHTML =
        '<div class="rs">' +
        '<div class="rs-label">' + esc(o.label || '録音') + '</div>' +
        '<div class="rs-time">0:00</div>' +
        '<div class="rs-wave"></div>' +
        '<div class="rs-hint">' + (o.minimizable ? '画面を消しても、ほかのアプリを開いても録音は続きます' : '画面を消しても録音は続きます') + '</div>' +
        '<div class="rs-row">' +
        (o.minimizable ? '<button class="rs-min press" data-act="min">録音したままメモ</button>' : '<span></span>') +
        '<button class="rs-stop press" data-act="stop" aria-label="録音を止める"><span></span></button>' +
        '<span></span></div></div>';
      const t = el.querySelector('.rs-time'); const w = el.querySelector('.rs-wave');
      const bars = []; for (let i = 0; i < 40; i++) { const b = document.createElement('i'); b.style.height = '6%'; w.appendChild(b); bars.push(b); }
      let k = 0;
      const un = Rec.sub(() => {
        t.textContent = D.dur(Rec.sec);
        for (let i = 0; i < 3; i++) { bars[k % 40].style.height = (15 + Math.random() * 85) + '%'; k++; }
      });
      el.querySelector('[data-act=stop]').onclick = () => { LM.shield(host); un(); const r = Rec.stop(); close(); o.onStop && o.onStop(r ? r.dur : 1); };
      const mn = el.querySelector('[data-act=min]');
      if (mn) mn.onclick = () => { un(); close(); o.onMin && o.onMin(); };
    };
    if (!Rec.on) Rec.start(o.ctx);
    sheet(host, body, { modal: true });
    return () => closeFn && closeFn();
  };

  // 録音を止めたあとのシートの見出しの行：題・長さと、右端に小さな赤字の「保存しない」
  // 「保存」はシートの一番下（停止ボタンのあった位置）に置き、「保存しない」は停止ボタンと重ならない見出しの右端に置く。
  // 停止を二度押ししても「保存」に当たり、残したいテイクを捨てないように
  LM.apHead = function (title, dur, discard) {
    return '<div class="ap-head"><span class="ap-title">' + esc(title) + '</span><span class="ap-dur">' + D.dur(dur) + '</span>' +
      (discard ? '<button class="ap-discard press" data-act="discard">保存しない</button>' : '') + '</div>';
  };

  // 録音を止めたあと：一言（と、押すと開く「次のレッスンで聞くこと」）。曲は録る前に選んでいるので選び直さない（fixedSong）
  // 見出しの右端に小さな赤字の「保存しない」：確かめずに捨て、通知の「取り消す」でこのシートに戻す（o.onDiscard）
  // o.note・o.ask：シートに戻したときに、書いていた一言と聞くことを入れておく
  LM.afterPracticeSheet = function (host, o) {
    const lesson = o.lesson;
    const songs = lesson ? lesson.songIds.map(D.song) : [];
    const others = D.songsOf(o.typeId || (lesson && lesson.typeId)).filter((s) => !songs.includes(s));
    let pick = o.songId || null; // 曲は自動で選ばない
    sheet(host, (el, close) => {
      const chips = (arr) => arr.map((s) => '<button class="chip press' + (pick === s.id ? ' on' : '') + '" data-song="' + s.id + '">' + esc(s.title) + '</button>').join('');
      const draw = () => {
        el.innerHTML =
          '<div class="ap">' +
          LM.apHead(o.title || '個人練の録音', o.dur, !!o.onDiscard) +
          (lesson ? '<div class="ap-sub">' + D.fmtDate(lesson.date) + 'のレッスンの後</div>' : '') +
          (o.fixedSong ? '' : '<div class="ap-k">曲</div>' +
          '<div class="chips">' + chips(songs) + (others.length ? '<details class="ap-more"' + (songs.length ? '' : ' open') + '><summary>ほかの曲</summary><div class="chips">' + chips(others) + '</div></details>' : '') + '</div>') +
          '<div class="ap-k">一言</div>' +
          '<input id="ap-note" class="ap-note" placeholder="例：移動は安定してきた" autocomplete="off">' +
          LM.askField() +
          '<button class="ap-save press" data-act="save">保存</button>' +
          '</div>';
        el.querySelectorAll('[data-song]').forEach((b) => (b.onclick = () => { pick = pick === b.dataset.song ? null : b.dataset.song; const v = el.querySelector('#ap-note').value; const open = el.querySelector('.ap-more') && el.querySelector('.ap-more').open; draw(); el.querySelector('#ap-note').value = v; if (open) el.querySelector('.ap-more').open = true; }));
        const askVal = LM.bindAskField(el);
        el.querySelector('[data-act=save]').onclick = () => { const note = el.querySelector('#ap-note').value; const ask = askVal(); close(); o.onSave({ songId: pick, note, ask }); };
        const dc = el.querySelector('[data-act=discard]');
        if (dc) dc.onclick = () => { const note = el.querySelector('#ap-note').value; const ask = askVal(); close(); o.onDiscard({ note, ask }); };
      };
      draw();
      if (o.note) el.querySelector('#ap-note').value = o.note;
      if (o.ask) { el.querySelector('[data-act=ask]').click(); el.querySelector('#ap-ask').value = o.ask; }
    }, { modal: true });
  };

  // 種類を選ぶ（新しいレッスン用）
  LM.typePicker = function (host, o) {
    sheet(host, (el, close) => {
      el.innerHTML = '<div class="tp"><div class="tp-title">' + esc(o.title || '新しいレッスン') + '</div>' +
        D.S.types.map((t) => '<button class="tp-item press" data-t="' + t.id + '"><b>' + esc(t.name) + '</b><span>' + esc(t.teacher) + '</span></button>').join('') +
        '<button class="tp-add press" data-act="add">＋ フォルダを追加</button></div>';
      el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { close(); o.onPick(b.dataset.t); }));
      el.querySelector('[data-act=add]').onclick = () => { close(); setTimeout(() => LM.addTypeSheet(host, { onAdd: (t) => o.onPick(t.id) }), 400); };
    });
  };

  LM.addTypeSheet = function (host, o) {
    sheet(host, (el, close) => {
      el.innerHTML = '<div class="tp"><div class="tp-title">フォルダを追加</div>' +
        '<input id="tp-name" class="ap-note" placeholder="例：ピアノ">' +
        '<input id="tp-teacher" class="ap-note" placeholder="先生・教室（なくてもいい）">' +
        '<button class="ap-save press" data-act="ok">追加</button></div>';
      el.querySelector('[data-act=ok]').onclick = () => {
        const n = el.querySelector('#tp-name').value.trim(); if (!n) return;
        const t = D.addType(n, el.querySelector('#tp-teacher').value.trim()); close(); o.onAdd && o.onAdd(t);
      };
      setTimeout(() => el.querySelector('#tp-name').focus(), 450);
    });
  };

  // 曲を選ぶ（レッスンで扱った曲）
  // 並びは最近の動きの新しい順。長い一覧では、しばらく動きのない曲を「ほかの曲（N）」に畳む（選んでいる曲は畳まない）
  // 並びは開いたときに決めて、選んでいる間は動かさない（選ぶとその曲の動きが今日になり、押した場所から逃げてしまうため）
  LM.songPicker = function (host, lesson, onDone) {
    const f = D.foldSongs(lesson.typeId);
    const recent = f.recent.slice(); let old = f.old.filter((s) => !lesson.songIds.includes(s.id));
    recent.push(...f.old.filter((s) => lesson.songIds.includes(s.id)));
    let openOld = false;
    sheet(host, (el, close) => {
      const chip = (s) => '<button class="chip press' + (lesson.songIds.includes(s.id) ? ' on' : '') + '" data-s="' + s.id + '">' + esc(s.title) + '</button>';
      const draw = () => {
        el.innerHTML = '<div class="tp"><div class="tp-title">扱った曲</div><div class="chips">' + recent.map(chip).join('') +
          (old.length ? (openOld ? old.map(chip).join('') : '<button class="chip press chip-more" data-act="old">ほかの曲（' + old.length + '）</button>') : '') +
          '</div><div class="sp-new"><input id="sp-new" class="ap-note" placeholder="新しい曲の名前"><button class="sp-add press" data-act="new">追加</button></div>' +
          '<button class="ap-save press" data-act="done">完了</button></div>';
        el.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { D.toggleSong(lesson.id, b.dataset.s); draw(); }));
        const ob = el.querySelector('[data-act=old]'); if (ob) ob.onclick = () => { openOld = true; draw(); };
        el.querySelector('[data-act=new]').onclick = () => { const v = el.querySelector('#sp-new').value.trim(); if (!v) return; const r = D.songByName(lesson.typeId, v); if (!lesson.songIds.includes(r.song.id)) D.toggleSong(lesson.id, r.song.id); if (!recent.includes(r.song)) { old = old.filter((x) => x !== r.song); recent.unshift(r.song); } draw(); if (r.existed) LM.toast(host, LM.sameSongMsg(r.song, 'を選びました')); };
        el.querySelector('[data-act=done]').onclick = () => { close(); onDone && onDone(); };
      };
      draw();
    }, { onClose: onDone });
  };

  // 同じ名前の曲があって新しく作らなかったときの短い通知（長い曲名は詰める。詰め方は LM.short で共通）
  LM.sameSongMsg = function (song, tail) { return 'すでにある「' + LM.short(song.title) + '」' + tail; };

  // 箇条書き（1行1項目）。Enterで次の行へ
  LM.bullets = function (lesson, field, cls) {
    const box = document.createElement('div');
    box.className = 'bl ' + (cls || '');
    const draw = (focus) => {
      box.innerHTML = '<ul>' + lesson[field].map((t, i) => '<li><span>' + esc(t) + '</span><button class="bl-del" data-i="' + i + '" aria-label="削除">' + I.x + '</button></li>').join('') + '</ul>' +
        '<div class="bl-add"><input class="bl-in" id="bl-' + lesson.id + '-' + field + '" placeholder="＋ 追加" enterkeyhint="next" autocomplete="off"></div>';
      const inp = box.querySelector('.bl-in');
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); const v = inp.value; inp.value = ''; if (v.trim()) { D.addBullet(lesson.id, field, v); draw(true); } }
      });
      inp.addEventListener('blur', () => { const v = inp.value; inp.value = ''; if (v.trim()) { D.addBullet(lesson.id, field, v); setTimeout(() => draw(false), 0); } });
      box.querySelectorAll('.bl-del').forEach((b) => (b.onclick = () => { D.removeBullet(lesson.id, field, +b.dataset.i); draw(false); }));
      if (focus) box.querySelector('.bl-in').focus();
    };
    draw(false);
    return box;
  };

  // 再生ボタン付きの録音行。同じ録音なら一時停止／再開（位置は保つ）
  LM.playBtn = function (rec, cls) {
    const b = document.createElement('button');
    b.className = 'pb press ' + (cls || '');
    const draw = () => {
      const on = LM.Play.id === rec.id; const going = on && !LM.Play.paused;
      b.innerHTML = '<span class="pb-i">' + (going ? I.pause : I.play) + '</span><span class="pb-t">' + (on ? D.dur(Math.floor(LM.Play.pos)) + ' / ' : '') + D.dur(rec.dur) + '</span>';
      b.classList.toggle('on', on);
      // 読み上げでは「46:12」だけでは何が起きるか分からないので、日付・曲・長さを読む
      const sg = rec.songId && D.song(rec.songId);
      const what = rec.kind === 'lesson' ? D.fmtDate(D.lesson(rec.lessonId).date) + 'のレッスンの録音' : D.md(rec.date) + (rec.kind === 'practice' ? ' 個人練 ' : ' ') + (sg ? sg.title : '曲なし');
      b.setAttribute('aria-label', what + '、' + D.say(rec.dur) + (going ? 'を一時停止' : (on ? 'を再開' : 'を再生')));
    };
    b.onclick = (e) => { e.stopPropagation(); LM.Play.toggle(rec); };
    const un = LM.Play.sub(() => { if (!b.isConnected) { if (b._seen) un(); return; } b._seen = true; draw(); }); draw();
    return b;
  };

  // 「次のレッスンで聞くこと」の入力欄（一言のシートに添える。押すまでは畳んでおく）
  LM.askField = function () {
    return '<button class="ap-ask" data-act="ask">＋ 次のレッスンで聞くこと</button>' +
      '<div class="ap-askf" hidden><div class="ap-k" style="margin-bottom:6px">次のレッスンで聞くこと</div><input id="ap-ask" class="ap-note" placeholder="例：20小節目の弓順はこれで合っている？" autocomplete="off"></div>';
  };
  LM.bindAskField = function (el) {
    const b = el.querySelector('[data-act=ask]'); const inp = el.querySelector('#ap-ask'); if (!b) return () => '';
    b.onclick = () => { b.hidden = true; el.querySelector('.ap-askf').hidden = false; inp.focus(); };
    return () => inp.value;
  };
})();

// 個人練の「譜面台」画面：録音しながら宿題と学んだことを大きく見せる
(function () {
  const { D, Rec, esc, I } = LM;
  LM.practiceStand = function (host, o) {
    const l = o.lesson; const t = D.type(l.typeId);
    const song = o.songId ? D.song(o.songId) : null; const learned = o.learned || l.learned;
    // groups：見出しごとの学んだこと（曲を選んだときは、その曲の行 → 言葉の題・題なしの行）
    const groups = (o.groups || [{ k: song ? 'この曲で学んだこと' : '学んだこと', items: learned }]).filter((g) => g.items.length);
    const el = document.createElement('div');
    el.className = 'stand';
    el.innerHTML =
      '<div class="st-top"><span class="st-dot"></span><span class="st-time">0:00</span><span class="st-lbl">' + esc(t.name) + ' · ' + D.md(l.date) + 'のレッスン後</span></div>' +
      '<div class="st-body">' + (song ? '<div class="st-song">♪ ' + esc(song.title) + '</div>' : '') +
      // 宿題が0件のときは見出しごと出さない（見出しのすぐ下に学んだことが続くと、宿題が抜けたように見えるため）
      (l.homework.length ? '<div class="st-k">宿題</div><ul class="st-hw">' + l.homework.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      groups.map((g) => '<div class="st-k">' + esc(g.k) + '</div><ul class="st-lr">' + g.items.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>').join('') +
      '</div>' +
      '<div class="st-foot"><span class="st-hint">画面を消しても録音は続きます</span><button class="rs-stop press" aria-label="録音を止める"><span></span></button></div>';
    host.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    if (!Rec.on) Rec.start({ stand: true });
    const tm = el.querySelector('.st-time');
    const un = Rec.sub(() => { tm.textContent = D.dur(Rec.sec); });
    el.querySelector('.rs-stop').onclick = () => {
      LM.shield(host); // 止めたあとのシートが出るまで、下の画面を押せないようにする
      un(); const r = Rec.stop(); el.classList.remove('in'); setTimeout(() => el.remove(), 420);
      setTimeout(() => o.onStop && o.onStop(r ? r.dur : 1), 200);
    };
  };
})();
