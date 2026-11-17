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
        '<div class="rs-hint">' + (o.minimizable ? 'ロック中・ほかのアプリでも録音は継続' : 'ロック中も録音は継続') + '</div>' +
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
      el.querySelector('[data-act=stop]').onclick = () => { un(); const r = Rec.stop(); close(); o.onStop && o.onStop(r ? r.dur : 1); };
      const mn = el.querySelector('[data-act=min]');
      if (mn) mn.onclick = () => { un(); close(); o.onMin && o.onMin(); };
    };
    if (!Rec.on) Rec.start(o.ctx);
    sheet(host, body, { modal: true });
    return () => closeFn && closeFn();
  };

  // 録音を止めたあと：どの曲か＋一言
  LM.afterPracticeSheet = function (host, o) {
    const lesson = o.lesson;
    const songs = lesson ? lesson.songIds.map(D.song) : [];
    const others = D.songsOf(o.typeId || (lesson && lesson.typeId)).filter((s) => !songs.includes(s));
    let pick = o.songId || (songs.length === 1 ? songs[0].id : null);
    sheet(host, (el, close) => {
      const chips = (arr) => arr.map((s) => '<button class="chip press' + (pick === s.id ? ' on' : '') + '" data-song="' + s.id + '">' + esc(s.title) + '</button>').join('');
      const draw = () => {
        el.innerHTML =
          '<div class="ap">' +
          '<div class="ap-head"><span class="ap-title">' + esc(o.title || '個人練の録音') + '</span><span class="ap-dur">' + D.dur(o.dur) + '</span></div>' +
          (lesson ? '<div class="ap-sub">' + D.fmtDate(lesson.date) + 'のレッスンの後</div>' : '') +
          '<div class="ap-k">曲</div>' +
          '<div class="chips">' + chips(songs) + (others.length ? '<details class="ap-more"' + (songs.length ? '' : ' open') + '><summary>ほかの曲</summary><div class="chips">' + chips(others) + '</div></details>' : '') + '</div>' +
          '<div class="ap-k">一言</div>' +
          '<input id="ap-note" class="ap-note" placeholder="例：移動は安定してきた" autocomplete="off">' +
          '<button class="ap-save press" data-act="save">保存</button>' +
          '</div>';
        el.querySelectorAll('[data-song]').forEach((b) => (b.onclick = () => { pick = pick === b.dataset.song ? null : b.dataset.song; const v = el.querySelector('#ap-note').value; const open = el.querySelector('.ap-more') && el.querySelector('.ap-more').open; draw(); el.querySelector('#ap-note').value = v; if (open) el.querySelector('.ap-more').open = true; }));
        el.querySelector('[data-act=save]').onclick = () => { const note = el.querySelector('#ap-note').value; close(); o.onSave({ songId: pick, note }); };
      };
      draw();
    }, { modal: true });
  };

  // 種類を選ぶ（新しいレッスン用）
  LM.typePicker = function (host, o) {
    sheet(host, (el, close) => {
      el.innerHTML = '<div class="tp"><div class="tp-title">' + esc(o.title || '新しいレッスン') + '</div>' +
        D.S.types.map((t) => '<button class="tp-item press" data-t="' + t.id + '"><b>' + esc(t.name) + '</b><span>' + esc(t.teacher) + '</span></button>').join('') +
        '<button class="tp-add press" data-act="add">＋ 種類を追加</button></div>';
      el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { close(); o.onPick(b.dataset.t); }));
      el.querySelector('[data-act=add]').onclick = () => { close(); setTimeout(() => LM.addTypeSheet(host, { onAdd: (t) => o.onPick(t.id) }), 400); };
    });
  };

  LM.addTypeSheet = function (host, o) {
    sheet(host, (el, close) => {
      el.innerHTML = '<div class="tp"><div class="tp-title">種類を追加</div>' +
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
  LM.songPicker = function (host, lesson, onDone) {
    sheet(host, (el, close) => {
      const draw = () => {
        el.innerHTML = '<div class="tp"><div class="tp-title">扱った曲</div><div class="chips">' +
          D.songsOf(lesson.typeId).map((s) => '<button class="chip press' + (lesson.songIds.includes(s.id) ? ' on' : '') + '" data-s="' + s.id + '">' + esc(s.title) + '</button>').join('') +
          '</div><div class="sp-new"><input id="sp-new" class="ap-note" placeholder="新しい曲の名前"><button class="sp-add press" data-act="new">追加</button></div>' +
          '<button class="ap-save press" data-act="done">完了</button></div>';
        el.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { D.toggleSong(lesson.id, b.dataset.s); draw(); }));
        el.querySelector('[data-act=new]').onclick = () => { const v = el.querySelector('#sp-new').value.trim(); if (!v) return; const s = D.addSong(lesson.typeId, v); D.toggleSong(lesson.id, s.id); draw(); };
        el.querySelector('[data-act=done]').onclick = () => { close(); onDone && onDone(); };
      };
      draw();
    }, { onClose: onDone });
  };

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

  // 再生ボタン付きの録音行
  LM.playBtn = function (rec, cls) {
    const b = document.createElement('button');
    b.className = 'pb press ' + (cls || '');
    const draw = () => {
      const on = LM.Play.id === rec.id;
      b.innerHTML = '<span class="pb-i">' + (on ? I.pause : I.play) + '</span><span class="pb-t">' + (on ? D.dur(LM.Play.pos) + ' / ' : '') + D.dur(rec.dur) + '</span>';
      b.classList.toggle('on', on);
    };
    b.onclick = (e) => { e.stopPropagation(); LM.Play.toggle(rec); };
    LM.Play.sub(draw); draw();
    return b;
  };
})();

// 個人練の「譜面台」画面：録音しながら宿題と学んだことを大きく見せる
(function () {
  const { D, Rec, esc, I } = LM;
  LM.practiceStand = function (host, o) {
    const l = o.lesson; const t = D.type(l.typeId);
    const el = document.createElement('div');
    el.className = 'stand';
    el.innerHTML =
      '<div class="st-top"><span class="st-dot"></span><span class="st-time">0:00</span><span class="st-lbl">' + esc(t.name) + ' · ' + D.md(l.date) + 'のレッスン後</span></div>' +
      '<div class="st-body">' +
      '<div class="st-k">宿題</div><ul class="st-hw">' + l.homework.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<div class="st-k">学んだこと</div><ul class="st-lr">' + l.learned.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '</div>' +
      '<div class="st-foot"><span class="st-hint">ロック中も録音は継続</span><button class="rs-stop press" aria-label="録音を止める"><span></span></button></div>';
    host.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    if (!Rec.on) Rec.start({ stand: true });
    const tm = el.querySelector('.st-time');
    const un = Rec.sub(() => { tm.textContent = D.dur(Rec.sec); });
    el.querySelector('.rs-stop').onclick = () => {
      un(); const r = Rec.stop(); el.classList.remove('in'); setTimeout(() => el.remove(), 420);
      setTimeout(() => o.onStop && o.onStop(r ? r.dur : 1), 200);
    };
  };
})();
