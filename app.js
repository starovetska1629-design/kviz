(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view'), hdr = $('#hdr');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// heart, star, flower, sparkle — doodle shapes drawn with a crayon edge
const SHAPES = [
  '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true" style="filter:url(#crayon)"><path d="M12 21.5C5.5 16.8 2 13.3 2 8.8 2 5.6 4.4 3.2 7.4 3.2c1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 3 0 5.4 2.4 5.4 5.6 0 4.5-3.5 8-10 12.7z"/></svg>',
  '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true" style="filter:url(#crayon)"><polygon points="12,1.5 15,8.6 22.7,9.3 16.9,14.4 18.6,22 12,18 5.4,22 7.1,14.4 1.3,9.3 9,8.6"/></svg>',
  '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true" style="filter:url(#crayon)"><circle cx="12" cy="5.6" r="4.3"/><circle cx="18.2" cy="10.1" r="4.3"/><circle cx="15.8" cy="17.4" r="4.3"/><circle cx="8.2" cy="17.4" r="4.3"/><circle cx="5.8" cy="10.1" r="4.3"/></svg>',
  '<svg class="shape" viewBox="0 0 24 24" aria-hidden="true" style="filter:url(#crayon)"><path d="M12 1c.8 6 4.9 10.2 11 11-6.1.8-10.2 5-11 11-.8-6-4.9-10.2-11-11 6.1-.8 10.2-5 11-11z"/></svg>'
];

/* ransom-note letters: each letter a scrap of a different magazine */
const CUT_BG = ['#F7BED3', '#FBE3A0', '#D9E3A6', '#C9D0F5', '#F6F0E4', '#E8458B', '#2B3BB5', '#F2542D', '#6E7A1E', '#1B2280', '#F5C443', '#FFFBF3'];
const CUT_FG = { '#E8458B': '#fff', '#2B3BB5': '#fff', '#F2542D': '#fff', '#6E7A1E': '#fff', '#1B2280': '#fff' };
const CUT_INK = ['#1B2280', '#E8458B', '#2B3BB5', '#F2542D', '#1B2280', '#6E7A1E'];
const CUT_FONT = ['var(--f-cut1)', 'var(--f-cut2)', 'var(--f-cut3)', 'var(--f-cut4)'];
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; }
function cut(text, size = 'md') {
  let n = hash(text);
  const rnd = () => (n = Math.imul(n ^ (n >>> 15), 2246822519) >>> 0, (n % 1000) / 1000);
  const words = String(text).split(/\s+/).filter(Boolean).map(w => `<span class="w">${[...w].map(ch => {
    const bg = CUT_BG[Math.floor(rnd() * CUT_BG.length)];
    const fg = CUT_FG[bg] || CUT_INK[Math.floor(rnd() * CUT_INK.length)];
    const f = CUT_FONT[Math.floor(rnd() * CUT_FONT.length)];
    const rot = (rnd() * 10 - 5).toFixed(1), dy = (rnd() * 6 - 3).toFixed(1);
    const up = rnd() > .55 ? 'uppercase' : 'none';
    return `<span class="l" style="background:${bg};color:${fg};font-family:${f};transform:rotate(${rot}deg) translateY(${dy}%);text-transform:${up}">${esc(ch)}</span>`;
  }).join('')}</span>`).join('');
  return `<span class="cut ${size}" role="text" aria-label="${esc(text)}">${words}</span>`;
}

/* crayon doodles scattered at the page edges */
(function deco() {
  const box = document.getElementById('deco'); if (!box) return;
  const cols = ['#E8458B', '#2B3BB5', '#F2542D', '#F5C443', '#A4B92F'];
  const star8 = 'M12 0l2.6 6.4L21 3.5l-2.9 6.4L24 12l-5.9 2.1 2.9 6.4-6.4-2.9L12 24l-2.6-6.4L3 21l2.9-6.4L0 12l5.9-2.1L3 3.5l6.4 2.9z';
  const star5 = 'M12 1.5l3 7.1 7.7.7-5.8 5.1 1.7 7.6L12 18l-6.6 4 1.7-7.6-5.8-5.1L9 8.6z';
  const spark = 'M12 1c.8 6 4.9 10.2 11 11-6.1.8-10.2 5-11 11-.8-6-4.9-10.2-11-11 6.1-.8 10.2-5 11-11z';
  const heart = 'M12 21.5C5.5 16.8 2 13.3 2 8.8 2 5.6 4.4 3.2 7.4 3.2c1.9 0 3.6 1 4.6 2.6 1-1.6 2.7-2.6 4.6-2.6 3 0 5.4 2.4 5.4 5.6 0 4.5-3.5 8-10 12.7z';
  const shapes = [star8, star5, spark, heart, star5];
  let n = 7; const r = () => (n = (n * 9301 + 49297) % 233280) / 233280;
  let html = '';
  for (let i = 0; i < 26; i++) {
    const side = i % 4; // keep doodles near the edges so text stays readable
    const x = side === 0 ? r() * 9 : side === 1 ? 91 + r() * 7 : r() * 100;
    const y = side === 2 ? r() * 8 : side === 3 ? 92 + r() * 6 : r() * 100;
    const s = 18 + r() * 34, c = cols[Math.floor(r() * cols.length)], d = shapes[Math.floor(r() * shapes.length)];
    const outline = r() > .7;
    html += `<svg viewBox="0 0 24 24" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;transform:translate(-50%,-50%) rotate(${Math.round(r() * 60 - 30)}deg)"><path d="${d}" fill="${outline ? 'none' : c}" stroke="${c}" stroke-width="${outline ? 1.6 : 0}" stroke-linejoin="round"/></svg>`;
  }
  box.innerHTML = html;
  const b = document.getElementById('brand'); if (b) b.innerHTML = cut('Квіз Сцена', 'sm');
})();
const LETTERS = ['A', 'B', 'C', 'D'];
const CHECK = '<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#fff"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#0A0F1F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const EMOJI = ['🦊', '🐙', '🦉', '🐝', '🐸', '🐼', '🦄', '🐯', '🐧', '🐢', '🦖', '🐳'];
const LIM = { q: 200, o: 90, nick: 16 };
const IS_HOST = location.pathname.replace(/\/+$/, '') === '/host';

const socket = io({ transports: ['websocket', 'polling'] });
let online = false;
let mode = IS_HOST ? 'boot' : 'join'; // join | player | hostEdit | host
let screenKey = '';
let deadline = 0, lim = 0, lastTimed = '';

/* ---------- host state ---------- */
const H = {
  sets: loadSets(), cur: Math.max(0, LS.get('kviz.cur', 0)),
  session: LS.get('kviz.hostSession', null), // {pin, hostToken}
  S: null, msg: '', confirmClear: false
};
if (H.cur >= H.sets.length) H.cur = 0;
Object.defineProperty(H, 'questions', { get() { return H.sets[H.cur].questions; }, set(v) { H.sets[H.cur].questions = v; } });
const saveQs = () => { LS.set('kviz.sets', H.sets); LS.set('kviz.cur', H.cur); };
function builtinSets() {
  const src = Array.isArray(window.KVIZ_SETS) && window.KVIZ_SETS.length ? window.KVIZ_SETS : [{ name: 'Раунд 1', questions: window.KVIZ_QUESTIONS || [] }];
  return JSON.parse(JSON.stringify(src));
}
function loadSets() {
  let sets = LS.get('kviz.sets', null);
  if (!Array.isArray(sets) || !sets.length) {
    const old = LS.get('kviz.questions', null);
    sets = old ? [{ name: 'Раунд 1', questions: old }] : builtinSets();
  }
  return sets.map((s, i) => ({ name: String(s.name || 'Раунд ' + (i + 1)).slice(0, 40), questions: Array.isArray(s.questions) ? s.questions : [] }));
}
const setPayload = i => {
  const set = H.sets[i];
  const qs = set.questions.filter(q => String(q.text).trim() && q.options.filter(o => String(o).trim()).length >= 2 && String(q.options[q.correct] || '').trim())
    .map(q => ({ text: q.text, options: q.options, correct: q.correct, time: q.time }));
  return { title: set.name, questions: qs };
};

/* ---------- player state ---------- */
const urlPin = (new URLSearchParams(location.search).get('pin') || '').replace(/\D/g, '').slice(0, 6);
const P = {
  saved: LS.get('kviz.player', null), // {pin, pid, nick}
  nick: LS.get('kviz.nick', ''),
  emoji: LS.get('kviz.emoji', EMOJI[Math.floor(Math.random() * EMOJI.length)]),
  pin: urlPin, S: null, err: '', joining: false
};

/* ---------- header ---------- */
function renderHeader() {
  let s = '';
  if (mode === 'host' && H.S) s += `<span class="pill">PIN <b style="font-family:var(--f-mono);color:var(--fg)">${esc(H.S.pin)}</b></span><span class="pill">👥 <b id="hdrCount">${onlineCount()}</b>&nbsp;гравців</span>`;
  if (mode === 'player' && P.S && P.S.me) s += `<span class="pill">${esc(P.S.me.emoji)} ${esc(P.S.me.nick)}</span>`;
  s += `<span class="pill"><span class="dot ${online ? 'on' : 'off'}"></span>${online ? 'Наживо' : 'Підключення…'}</span>`;
  hdr.innerHTML = s;
}
const plural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
const onlineCount = () => H.S && H.S.players ? H.S.players.filter(p => p.online).length : 0;

/* ---------- socket ---------- */
socket.on('connect', () => {
  online = true; renderHeader();
  if (IS_HOST) {
    if (H.session) socket.emit('host:resume', H.session, r => {
      if (r && r.ok) { mode = 'host'; render(true); }
      else { H.session = null; LS.set('kviz.hostSession', null); if (mode !== 'hostEdit') { mode = 'hostEdit'; render(true); } }
    });
    else if (mode === 'boot') { mode = 'hostEdit'; render(true); }
  } else {
    const sv = P.saved;
    if (sv && sv.pid && (!urlPin || urlPin === sv.pin)) rejoin(sv.pin, sv.nick, sv.pid, true);
  }
});
socket.on('disconnect', () => { online = false; renderHeader(); });
socket.on('host:state', s => { H.S = s; if (mode === 'host') render(false); });
socket.on('host:replaced', () => { H.S = null; mode = 'hostEdit'; H.msg = 'Гру відкрито в іншій вкладці.'; render(true); });
socket.on('state', s => { const prev = P.S; P.S = s; syncTimer(s); if (!prev || mode === 'player') { mode = 'player'; } render(false); });
socket.on('closed', () => { leavePlayer('Ведучий завершив гру.'); });
socket.on('kicked', d => { leavePlayer((d && d.reason) || 'Вас відключено від гри.'); });

function leavePlayer(msg) {
  P.saved = null; LS.set('kviz.player', null); P.S = null; P.err = msg; mode = 'join'; render(true);
}
function rejoin(pin, nick, pid, silent) {
  P.joining = true;
  socket.emit('player:join', { pin, nick, emoji: P.emoji, pid }, r => {
    P.joining = false;
    if (!r || r.error) {
      if (silent && pid) { P.saved = null; LS.set('kviz.player', null); if (mode === 'join') render(true); return; }
      P.err = (r && r.error) || 'Не вдалося приєднатися.'; mode = 'join'; render(true); return;
    }
    P.saved = { pin: r.pin, pid: r.pid, nick: r.nick }; LS.set('kviz.player', P.saved);
    P.err = ''; mode = 'player'; render(true);
  });
}

function syncTimer(s) {
  const key = s.phase + ':' + s.qi;
  if ((s.phase === 'question' || s.phase === 'ready') && typeof s.rem === 'number') {
    const nd = Date.now() + s.rem;
    if (key !== lastTimed || Math.abs(nd - deadline) > 600) deadline = nd;
    lim = s.phase === 'question' && s.q ? s.q.lim * 1000 : 0;
  }
  lastTimed = key;
}

/* ---------- router ---------- */
function render(force) {
  let key = mode;
  if (mode === 'host' && H.S) key += H.S.phase + H.S.qi + H.S.title + H.S.n;
  if (mode === 'player' && P.S) key += P.S.phase + P.S.qi + P.S.title + (P.S.me && P.S.me.answered ? 'a' : '');
  if (!force && key === screenKey) { refresh(); return; }
  screenKey = key;
  renderHeader();
  if (mode === 'boot') { view.innerHTML = `<div class="center"><div class="eyebrow pulse">Підключення до сервера…</div></div>`; return; }
  if (mode === 'join') return renderJoin();
  if (mode === 'player') return renderPlayer();
  if (mode === 'hostEdit') return renderEditor();
  if (mode === 'host') { if (H.S) syncTimer(H.S); return renderHost(); }
}

/* =========================================================
   PLAYER
   ========================================================= */
function renderJoin() {
  view.innerHTML = `
  <div class="center">
    <div class="pwrap" style="justify-content:center;flex:0">
      ${cut('Грай з нами!', 'md')}
      <div class="eyebrow">Без реєстрації: лише PIN і ім'я</div>
      <label for="pin" class="lbl">PIN гри з екрана</label>
      <input id="pin" class="field pin-input" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="000000" value="${esc(P.pin)}">
      <label for="nick" class="lbl">Твоє ім'я</label>
      <input id="nick" class="field nick" maxlength="${LIM.nick}" placeholder="Нікнейм" autocomplete="off" value="${esc(P.nick)}">
      <div class="emojis" role="group" aria-label="Аватар">
        ${EMOJI.map(e => `<button type="button" data-em="${e}" aria-pressed="${e === P.emoji}">${e}</button>`).join('')}
      </div>
      <p class="err" id="err">${esc(P.err)}</p>
      <button class="btn big" id="joinBtn">Увійти в гру</button>
      <a class="link" href="/host" style="text-align:center">Я ведучий →</a>
    </div>
  </div>`;
  const pin = $('#pin'), nick = $('#nick');
  pin.oninput = () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); P.pin = pin.value; };
  view.querySelectorAll('[data-em]').forEach(b => b.onclick = () => {
    P.emoji = b.dataset.em; LS.set('kviz.emoji', P.emoji);
    view.querySelectorAll('[data-em]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
  const go = () => {
    const p = pin.value.trim(), n = nick.value.trim().slice(0, LIM.nick);
    if (p.length !== 6) { $('#err').textContent = 'PIN складається з 6 цифр.'; pin.focus(); return; }
    if (!n) { $('#err').textContent = 'Введіть нікнейм.'; nick.focus(); return; }
    if (!online) { $('#err').textContent = 'Немає зв\'язку з сервером. Зачекайте секунду.'; return; }
    P.nick = n; LS.set('kviz.nick', n);
    $('#joinBtn').disabled = true;
    rejoin(p, n, null, false);
  };
  $('#joinBtn').onclick = go;
  pin.onkeydown = nick.onkeydown = e => { if (e.key === 'Enter') go(); };
  (P.pin ? (P.nick ? $('#joinBtn') : nick) : pin).focus();
}

function renderPlayer() {
  const S = P.S;
  if (!S) { view.innerHTML = `<div class="center"><div class="eyebrow pulse">Підключення до гри…</div></div>`; return; }
  const me = S.me || {};
  if (S.phase === 'lobby') {
    view.innerHTML = `<div class="center">
      <div style="font-size:72px">${esc(me.emoji)}</div>
      <div class="eyebrow">Раунд «${esc(S.title)}»</div>
      ${cut('Ти в грі!', 'md')}
      <h2 style="font-size:26px">${esc(me.nick)}</h2>
      <p class="muted" style="margin:0">Дивись на великий екран. Гра скоро почнеться.</p>
      <div class="pill"><b>${S.pl || 1}</b>&nbsp;гравців у залі</div>
      <button class="btn ghost" id="leave">Вийти</button>
    </div>`;
    $('#leave').onclick = () => { socket.emit('player:leave'); leavePlayer(''); };
    return;
  }
  if (S.phase === 'ready') {
    view.innerHTML = `<div class="center">
      <div class="eyebrow">Питання ${S.qi + 1} з ${S.n}</div>
      <h2 style="font-size:clamp(22px,6vw,34px)">${esc(S.q && S.q.t)}</h2>
      <div class="readybar"><i></i></div>
      <p class="muted" style="margin:0">Приготуйся…</p>
    </div>`;
    return;
  }
  if (S.phase === 'question') {
    const a = me.answered;
    const opts = (S.q && S.q.o) || [];
    view.innerHTML = `<div class="pwrap">
      <div class="qtop"><div class="eyebrow">Питання ${S.qi + 1} / ${S.n}</div><div class="spacer"></div>${ringHTML()}</div>
      <div style="font-weight:800;font-size:18px;text-align:center">${esc(S.q && S.q.t)}</div>
      <div class="pads ${a ? 'locked' : ''}">
        ${opts.map((o, i) => !String(o).trim() ? '' : `<button class="tile c${i} ${a && me.choice === i ? 'picked' : ''}" data-c="${i}" ${a ? 'disabled' : ''} aria-label="${LETTERS[i]}: ${esc(o)}">${SHAPES[i]}<span class="txt">${esc(o)}</span></button>`).join('')}
      </div>
      ${a ? `<p class="muted pulse" style="text-align:center;margin:0">Відповідь прийнято. Чекаємо на інших…</p>` : ''}
    </div>`;
    if (!a) view.querySelectorAll('.pads .tile').forEach(b => b.onclick = () => {
      const c = +b.dataset.c;
      socket.emit('player:answer', c);
      // show the choice right away; the server's state confirms it
      view.querySelector('.pads').classList.add('locked');
      b.classList.add('picked');
      view.querySelectorAll('.pads .tile').forEach(x => x.disabled = true);
      if (navigator.vibrate) try { navigator.vibrate(30); } catch {}
    });
    refresh();
    return;
  }
  if (S.phase === 'reveal') {
    const ok = me.correct, answered = me.answered;
    const right = S.q && S.q.o ? S.q.o[S.c] : '';
    view.innerHTML = `<div class="pwrap" style="justify-content:center">
      <div class="verdict ${ok ? 'ok' : 'no'}">
        <div style="font-size:56px">${ok ? '🎉' : answered ? '😬' : '⏰'}</div>
        <h2>${ok ? 'Правильно!' : answered ? 'Не цього разу' : 'Час вийшов'}</h2>
        <div class="pts">+${me.delta || 0}</div>
        ${!ok ? `<div class="muted">Правильна відповідь: <b style="color:var(--fg)">${esc(right)}</b></div>` : ''}
      </div>
      <div class="me-line"><span class="muted">Рахунок</span> <span style="font-family:var(--f-mono);font-size:22px">${me.score}</span> · <span>${me.rank} місце з ${me.total}</span></div>
    </div>`;
    return;
  }
  if (S.phase === 'overall') {
    view.innerHTML = `<div class="center">
      <div class="eyebrow">Загальний рейтинг</div>
      <div class="bigrank">${me.overallRank}</div><div style="font-weight:800;font-size:20px">місце з ${me.total}</div>
      <div class="pill" style="font-size:16px"><span style="color:var(--ink)">${me.overall}</span>&nbsp;балів за ${S.rp.length} ${plural(S.rp.length, 'раунд', 'раунди', 'раундів')}</div>
      ${me.overallRank <= 3 && me.overall > 0 ? cut(['Чемпіон!', 'Срібло!', 'Бронза!'][me.overallRank - 1], 'md') : ''}
    </div>`;
    if (me.overallRank <= 3 && me.overall > 0) confetti();
    return;
  }
  if (S.phase === 'board' || S.phase === 'final') {
    const fin = S.phase === 'final';
    view.innerHTML = `<div class="center">
      <div class="eyebrow">${fin ? 'Раунд «' + esc(S.title) + '» завершено' : 'Після питання ' + (S.qi + 1)}</div>
      <div class="bigrank">${me.rank}</div><div style="font-weight:800;font-size:20px">місце з ${me.total}</div>
      <div class="pill" style="font-size:16px"><span style="font-family:var(--f-mono);color:var(--fg)">${me.score}</span>&nbsp;балів</div>
      ${fin && me.rank <= 3 ? `<h2 style="font-size:26px">${['🥇 Перемога!', '🥈 Срібло!', '🥉 Бронза!'][me.rank - 1]}</h2>` : ''}
      ${fin && (S.rp || []).length > 1 ? `<p class="lbl" style="margin:0">Загальний рахунок: ${me.overall} · ${me.overallRank} місце</p>` : ''}
      ${!fin ? `<p class="muted" style="margin:0">Наступне питання вже скоро</p>` : `<p class="muted" style="margin:0">Чекай на наступний раунд!</p>`}
    </div>`;
    if (fin && me.rank <= 3) confetti();
  }
}

/* =========================================================
   HOST: question editor
   ========================================================= */
const validQs = () => H.questions.filter(q => String(q.text).trim() && q.options.filter(o => String(o).trim()).length >= 2 && String(q.options[q.correct] || '').trim());
const inLobby = () => H.S && H.S.phase === 'lobby' && H.session;

function renderEditor() {
  const anySample = H.questions.some(q => q.sample);
  const valid = validQs().length;
  view.innerHTML = `
  <div class="editor" id="editor">
    <div class="row">
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start"><div class="eyebrow">Ведучий</div>${cut('Питання', 'md')}</div>
      <div class="spacer"></div>
      ${inLobby() ? `<button class="btn ghost" id="backLobby">← Назад у лобі</button>` : ''}
      <button class="btn big" id="create" ${valid ? '' : 'disabled'}>${inLobby() ? 'Грати цей раунд' : 'Створити гру ▶'}</button>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <div class="lbl">Раунди — у кожного свій переможець</div>
      <div class="row">${H.sets.map((st, i) => `<button class="setchip ${i === H.cur ? 'on' : ''}" data-set="${i}">${esc(st.name)} <small>${st.questions.length}</small></button>`).join('')}
        <button class="mini" id="addSet">+ Новий раунд</button></div>
      <div class="row"><label class="hint" for="setName">Назва раунду</label>
        <input id="setName" class="field" style="max-width:340px" maxlength="40" value="${esc(H.sets[H.cur].name)}">
        <button class="mini" id="delSet" ${H.sets.length < 2 ? 'disabled' : ''}>Видалити раунд</button>
        ${Array.isArray(window.KVIZ_SETS) && window.KVIZ_SETS.length ? `<button class="mini" id="loadBuiltin">Завантажити вбудовані раунди</button>` : ''}</div>
    </div>
    <p class="err" id="hmsg">${esc(H.msg)}</p>
    <p class="hint" style="margin:0">${valid} з ${H.questions.length} питань готові до гри. Раунди й питання зберігаються в цьому браузері.</p>
    ${anySample ? `<div class="notice"><span class="sample-tag">Приклад</span> Це демонстраційні питання. Замініть їх своїми або вставте списком унизу сторінки.</div>` : ''}
    ${H.questions.map((q, qi) => `
    <div class="qcard" data-qi="${qi}">
      <div class="qhead">
        <span class="qnum">${String(qi + 1).padStart(2, '0')}</span>
        ${q.sample ? '<span class="sample-tag">Приклад</span>' : ''}
        <div class="spacer"></div>
        <label class="hint" for="t${qi}">Час</label>
        <select class="field" id="t${qi}" data-f="time">${[10, 15, 20, 30, 45, 60, 90, 120].map(t => `<option value="${t}" ${q.time === t ? 'selected' : ''}>${t} с</option>`).join('')}</select>
        <button class="mini" data-act="up" ${qi === 0 ? 'disabled' : ''} aria-label="Вгору">↑</button>
        <button class="mini" data-act="down" ${qi === H.questions.length - 1 ? 'disabled' : ''} aria-label="Вниз">↓</button>
        <button class="mini" data-act="del">Видалити</button>
      </div>
      <textarea class="field" id="q${qi}" data-f="text" maxlength="${LIM.q}" placeholder="Текст питання">${esc(q.text)}</textarea>
      <div class="opts">
        ${[0, 1, 2, 3].map(i => `<div class="opt ${q.correct === i ? 'ok' : ''}">
          <span style="color:var(--a${i + 1})">${SHAPES[i]}</span>
          <input type="text" id="o${qi}_${i}" data-f="opt" data-i="${i}" maxlength="${LIM.o}" placeholder="Варіант ${LETTERS[i]}${i > 1 ? ' (необов\'язково)' : ''}" value="${esc(q.options[i] || '')}">
          <label><input type="radio" name="c${qi}" id="c${qi}_${i}" data-f="correct" data-i="${i}" ${q.correct === i ? 'checked' : ''}>вірна</label>
        </div>`).join('')}
      </div>
    </div>`).join('')}
    <div class="row"><button class="btn" id="addQ">+ Додати питання</button><div class="spacer"></div>
      <button class="btn danger" id="clearAll">Видалити всі</button></div>
    <details class="bulk card">
      <summary>Вставити питання списком</summary>
      <p class="hint">Кожне питання окремим блоком через порожній рядок. Перший рядок — питання, далі 2–4 варіанти. Правильний позначте зірочкою <b>*</b>. Необов'язково: рядок «час: 30».</p>
      <pre>Столиця Франції?
Мадрид
*Париж
Рим
Берлін
час: 15</pre>
      <textarea class="field" id="bulk" rows="8" placeholder="Вставте сюди…"></textarea>
      <div class="row" style="margin-top:10px"><button class="btn" id="bulkAdd">Додати з тексту</button>
        <label class="hint"><input type="checkbox" id="bulkReplace"> замінити наявні</label><span class="hint" id="bulkMsg"></span></div>
    </details>
  </div>`;
  $('#create').onclick = createOrSave;
  const bl = $('#backLobby'); if (bl) bl.onclick = () => { mode = 'host'; H.msg = ''; render(true); };
}

function createOrSave() {
  const payload = setPayload(H.cur), qs = payload.questions;
  if (!qs.length) return;
  saveQs();
  if (!online) { H.msg = 'Немає зв\'язку з сервером. Зачекайте кілька секунд.'; $('#hmsg').textContent = H.msg; return; }
  $('#create').disabled = true;
  if (inLobby()) {
    socket.emit('host:questions', payload, r => {
      if (r && r.ok) { H.msg = ''; mode = 'host'; render(true); }
      else { H.msg = (r && r.error) || 'Не вдалося зберегти.'; render(true); }
    });
  } else {
    socket.emit('host:create', payload, r => {
      if (r && r.pin) { H.session = { pin: r.pin, hostToken: r.hostToken }; LS.set('kviz.hostSession', H.session); H.msg = ''; mode = 'host'; render(true); }
      else { H.msg = (r && r.error) || 'Не вдалося створити гру.'; render(true); }
    });
  }
}

document.addEventListener('input', e => {
  if (mode !== 'hostEdit') return;
  if (e.target.id === 'setName') {
    H.sets[H.cur].name = e.target.value.slice(0, 40) || 'Раунд ' + (H.cur + 1); saveQs();
    const chip = view.querySelector('.setchip.on'); if (chip) chip.firstChild.textContent = H.sets[H.cur].name + ' ';
    return;
  }
  const card = e.target.closest && e.target.closest('.qcard'); if (!card) return;
  const q = H.questions[+card.dataset.qi]; if (!q) return;
  const f = e.target.dataset.f;
  if (f === 'text') q.text = e.target.value;
  else if (f === 'opt') q.options[+e.target.dataset.i] = e.target.value;
  else if (f === 'time') q.time = +e.target.value;
  else if (f === 'correct') { q.correct = +e.target.dataset.i; card.querySelectorAll('.opt').forEach((o, i) => o.classList.toggle('ok', i === q.correct)); }
  delete q.sample;
  saveQs();
  const c = $('#create'); if (c) c.disabled = !validQs().length;
});
document.addEventListener('change', e => { if (mode === 'hostEdit' && e.target.dataset && (e.target.dataset.f === 'time' || e.target.dataset.f === 'correct')) e.target.dispatchEvent(new Event('input', { bubbles: true })); });
document.addEventListener('click', e => {
  if (mode !== 'hostEdit') return;
  const t = e.target.closest('button'); if (!t) return;
  const card = t.closest('.qcard');
  if (card && t.dataset.act) {
    const i = +card.dataset.qi, qs = H.questions;
    if (t.dataset.act === 'del') qs.splice(i, 1);
    if (t.dataset.act === 'up' && i > 0) [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
    if (t.dataset.act === 'down' && i < qs.length - 1) [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
    saveQs(); render(true); return;
  }
  if (t.dataset.set !== undefined) { H.cur = +t.dataset.set; saveQs(); render(true); return; }
  if (t.id === 'addSet') { H.sets.push({ name: 'Раунд ' + (H.sets.length + 1), questions: [{ text: '', options: ['', '', '', ''], correct: 0, time: 20 }] }); H.cur = H.sets.length - 1; saveQs(); render(true); const n = $('#setName'); n && n.select(); return; }
  if (t.id === 'delSet') {
    if (!H.confirmDel) { H.confirmDel = true; t.textContent = 'Точно видалити раунд?'; setTimeout(() => { H.confirmDel = false; const b = $('#delSet'); if (b) b.textContent = 'Видалити раунд'; }, 3000); return; }
    H.confirmDel = false; H.sets.splice(H.cur, 1); H.cur = Math.max(0, H.cur - 1); saveQs(); render(true); return;
  }
  if (t.id === 'loadBuiltin') {
    if (!H.confirmLoad) { H.confirmLoad = true; t.textContent = 'Замінити всі раунди вбудованими?'; setTimeout(() => { H.confirmLoad = false; const b = $('#loadBuiltin'); if (b) b.textContent = 'Завантажити вбудовані раунди'; }, 3000); return; }
    H.confirmLoad = false; H.sets = builtinSets(); H.cur = 0; saveQs(); render(true); return;
  }
  if (t.id === 'addQ') {
    H.questions.push({ text: '', options: ['', '', '', ''], correct: 0, time: 20 }); saveQs(); render(true);
    const cards = view.querySelectorAll('.qcard'); const last = cards[cards.length - 1];
    if (last) { last.scrollIntoView({ block: 'center' }); last.querySelector('textarea').focus(); }
    return;
  }
  if (t.id === 'clearAll') {
    if (!H.confirmClear) { H.confirmClear = true; t.textContent = 'Точно видалити всі?'; setTimeout(() => { H.confirmClear = false; const b = $('#clearAll'); if (b) b.textContent = 'Видалити всі'; }, 3000); return; }
    H.confirmClear = false; H.questions = []; saveQs(); render(true); return;
  }
  if (t.id === 'bulkAdd') {
    const parsed = parseBulk($('#bulk').value);
    if (!parsed.length) { $('#bulkMsg').textContent = 'Не знайшла жодного питання з 2+ варіантами.'; return; }
    H.questions = $('#bulkReplace').checked ? parsed : H.questions.filter(q => !q.sample).concat(parsed);
    saveQs(); render(true);
  }
});

function parseBulk(txt) {
  return String(txt).replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).map(lines => {
    let time = 20;
    lines = lines.filter(l => { const m = l.match(/^(час|time)\s*[:=]\s*(\d+)/i); if (m) { time = Math.min(120, Math.max(5, +m[2])); return false; } return true; });
    if (lines.length < 3) return null;
    const text = lines[0].replace(/^\d+[.)]\s*/, '').slice(0, LIM.q);
    let correct = 0;
    const options = lines.slice(1, 5).map((l, i) => {
      l = l.replace(/^[-–•]\s*/, '');
      if (/^[*+]/.test(l)) { correct = i; l = l.replace(/^[*+]\s*/, ''); }
      l = l.replace(/^[A-DА-Г][.)]\s+/i, '');
      if (/^[*+]/.test(l)) { correct = i; l = l.replace(/^[*+]\s*/, ''); }
      return l.slice(0, LIM.o);
    });
    while (options.length < 4) options.push('');
    return options.filter(Boolean).length >= 2 ? { text, options, correct, time } : null;
  }).filter(Boolean);
}

/* =========================================================
   HOST: game screens
   ========================================================= */
function renderHost() {
  const S = H.S;
  if (!S) { view.innerHTML = `<div class="center"><div class="eyebrow pulse">Підключення до гри…</div></div>`; return; }
  if (S.phase === 'lobby') return renderLobby();
  if (S.phase === 'ready') {
    view.innerHTML = `<div class="center">
      <div class="eyebrow">Питання ${S.qi + 1} з ${S.n}</div>
      <div class="qtext" style="flex:0"><span>${esc(S.q.t)}</span></div>
      <div class="readybar"><i></i></div>
    </div>`;
    return;
  }
  if (S.phase === 'question' || S.phase === 'reveal') {
    const rev = S.phase === 'reveal';
    const counts = S.counts || [0, 0, 0, 0];
    const total = Math.max(1, counts.reduce((a, b) => a + b, 0));
    view.innerHTML = `
      <div class="qtop">
        <div class="eyebrow">Питання ${S.qi + 1} / ${S.n}</div>
        <div class="spacer"></div>
        <div class="stat"><b id="ansCount">${S.answered}</b><span>з <span id="plCount">${onlineCount()}</span> відповіли</span></div>
        ${rev ? '' : ringHTML()}
      </div>
      <div class="qtext"><span>${esc(S.q.t)}</span></div>
      <div class="tiles">
        ${S.q.o.map((o, i) => !String(o).trim() ? '' : `<div class="tile c${i} ${rev ? (i === S.c ? 'win' : 'dim') : ''}">${SHAPES[i]}<span class="txt">${esc(o)}</span>
          ${rev ? `<span class="cnt">${i === S.c ? CHECK : ''}${counts[i]}</span><span class="bar" style="width:0" data-w="${Math.round(100 * counts[i] / total)}"></span>` : ''}</div>`).join('')}
      </div>
      <div class="actions">
        <button class="btn ghost" id="hEnd">Завершити гру</button>
        ${rev ? `<button class="btn big" id="hNext">Таблиця лідерів →</button>` : `<button class="btn ghost" id="hNext">Зупинити таймер</button>`}
      </div>`;
    if (rev) requestAnimationFrame(() => requestAnimationFrame(() => view.querySelectorAll('.bar[data-w]').forEach(b => b.style.width = b.dataset.w + '%')));
    bindHostButtons();
    refresh();
    return;
  }
  if (S.phase === 'board') {
    const top = S.top || [];
    const last = S.qi >= S.n - 1;
    view.innerHTML = `
      <div class="qtop"><div class="eyebrow">Після питання ${S.qi + 1} з ${S.n}</div></div>
      <div class="center" style="justify-content:flex-start">
        ${cut('Лідери', 'md')}
        <div class="board">${top.length ? top.map((s, i) => `<div class="brow" style="animation-delay:${i * 90}ms"><span class="rk">${i + 1}</span><span class="em">${esc(s.emoji)}</span><span class="nm">${esc(s.nick)}</span><span class="sc">${s.score}${s.delta ? `<span class="dl">+${s.delta}</span>` : ''}</span></div>`).join('') : '<p class="muted">Ще ніхто не грає</p>'}</div>
      </div>
      <div class="actions"><button class="btn ghost" id="hEnd">Завершити гру</button><button class="btn big" id="hNext">${last ? 'Фінал 🏆' : 'Наступне питання →'}</button></div>`;
    bindHostButtons();
    return;
  }
  if (S.phase === 'final') {
    const r = S.top || [];
    const pod = [r[1], r[0], r[2]];
    view.innerHTML = `
      <div class="center">
        <div class="eyebrow">Фінал раунду «${esc(S.title)}»</div>
        ${cut('Переможці', 'md')}
        <div class="podium">${pod.map((s, i) => { const place = [2, 1, 3][i]; return s ? `<div class="pod p${place}"><span class="em">${esc(s.emoji)}</span><span class="nm">${esc(s.nick)}</span><span class="sc">${s.score}</span><div class="blk">${place}</div></div>` : `<div class="pod p${place}"></div>`; }).join('')}</div>
        ${r.length > 3 ? `<div class="board" style="max-width:560px">${r.slice(3, 8).map((s, i) => `<div class="brow" style="animation-delay:${1.2 + i * .08}s"><span class="rk">${i + 4}</span><span class="em">${esc(s.emoji)}</span><span class="nm">${esc(s.nick)}</span><span class="sc">${s.score}</span></div>`).join('')}</div>` : ''}
      </div>
      <div class="actions"><button class="btn ghost" id="hClose">Закрити гру</button>
        <button class="btn ghost" id="hAgain">Повторити раунд</button>
        ${H.cur < H.sets.length - 1 ? `<button class="btn" id="hOverall">Загальний рейтинг</button><button class="btn big" id="hNextRound">Наступний раунд: ${esc(H.sets[H.cur + 1].name)} →</button>` : `<button class="btn big" id="hOverall">Загальний рейтинг 🏆</button>`}</div>`;
    bindHostButtons();
    $('#hAgain').onclick = () => socket.emit('host:next');
    const nr = $('#hNextRound'); if (nr) nr.onclick = () => switchRound(H.cur + 1);
    $('#hOverall').onclick = () => socket.emit('host:overall');
    setTimeout(confetti, 1300);
    return;
  }
  if (S.phase === 'overall') {
    const r = (S.top || []).filter(s => s.overall > 0 || (S.rp || []).length);
    const pod = [r[1], r[0], r[2]];
    const next = H.cur < H.sets.length - 1 ? H.sets[H.cur + 1] : null;
    view.innerHTML = `
      <div class="center">
        <div class="eyebrow">Після ${S.rp.length} ${plural(S.rp.length, 'раунду', 'раундів', 'раундів')}: ${S.rp.map(t => '«' + esc(t) + '»').join(', ')}</div>
        ${cut('Загальний рейтинг', 'md')}
        ${r.length ? `<div class="podium">${pod.map((s, i) => { const place = [2, 1, 3][i]; return s ? `<div class="pod p${place}"><span class="em">${esc(s.emoji)}</span><span class="nm">${esc(s.nick)}</span><span class="sc">${s.overall}</span><div class="blk">${place}</div></div>` : `<div class="pod p${place}"></div>`; }).join('')}</div>` : '<p class="muted">Ще не зіграно жодного раунду.</p>'}
        ${r.length > 3 ? `<div class="board" style="max-width:560px">${r.slice(3, 10).map((s, i) => `<div class="brow" style="animation-delay:${1.2 + i * .08}s"><span class="rk">${i + 4}</span><span class="em">${esc(s.emoji)}</span><span class="nm">${esc(s.nick)}</span><span class="sc">${s.overall}</span></div>`).join('')}</div>` : ''}
      </div>
      <div class="actions"><button class="btn ghost" id="hClose">Закрити гру</button>
        <button class="btn danger" id="hReset">Скинути рейтинг</button>
        ${next ? `<button class="btn big" id="hNextRound">Наступний раунд: ${esc(next.name)} →</button>` : `<button class="btn big" id="hNext">До лобі</button>`}</div>`;
    bindHostButtons();
    const nr = $('#hNextRound'); if (nr) nr.onclick = () => switchRound(H.cur + 1);
    $('#hReset').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Точно скинути?'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Скинути рейтинг'; } }, 3000); return; }
      socket.emit('host:resetOverall');
    };
    if (r.length) setTimeout(confetti, 1300);
  }
}
function bindHostButtons() {
  const n = $('#hNext'); if (n) n.onclick = () => socket.emit('host:next');
  const e = $('#hEnd'); if (e) e.onclick = () => socket.emit('host:end');
  const c = $('#hClose'); if (c) c.onclick = closeHostGame;
}
function switchRound(i) {
  const payload = setPayload(i);
  if (!payload.questions.length) { const m = $('#lmsg'); if (m) m.textContent = 'У раунді «' + H.sets[i].name + '» немає готових питань.'; return; }
  H.cur = i; saveQs();
  if (H.S && H.S.phase !== 'lobby') socket.emit('host:end');
  socket.emit('host:questions', payload, r => { if (!r || !r.ok) { const m = $('#lmsg'); if (m) m.textContent = (r && r.error) || 'Не вдалося змінити раунд.'; } });
}
function closeHostGame() {
  socket.emit('host:close');
  H.session = null; LS.set('kviz.hostSession', null); H.S = null; mode = 'hostEdit'; render(true);
}

function renderLobby() {
  const S = H.S;
  const url = location.origin + '/?pin=' + S.pin;
  view.innerHTML = `
  <div class="lobby">
    <div class="join-box">
      <div class="eyebrow">Заходьте з телефона</div>
      <div class="url">${esc(location.host)}</div>
      <div class="pinbox">
        <div style="display:flex;flex-direction:column;gap:10px"><div class="eyebrow">PIN гри</div>${cut(S.pin, 'lg')}</div>
        <div class="tape"><img class="qr" src="/qr.svg?t=${encodeURIComponent(url)}" alt="QR-код для входу в гру" width="190" height="190"></div>
      </div>
      <p class="muted" style="margin:0">Скануйте QR-код або відкрийте сайт і введіть PIN. Реєстрація не потрібна.</p>
      <div class="row" style="gap:10px"><label class="lbl" for="roundSel">Раунд:</label>
        <select id="roundSel" class="field" style="max-width:300px">${H.sets.map((st, i) => `<option value="${i}" ${st.name === S.title && i === H.cur ? 'selected' : ''}>${esc(st.name)}</option>`).join('')}</select>
        <span class="muted">${S.n} питань</span></div>
      <p class="err" id="lmsg"></p>
      <div class="row" style="gap:12px">
        <button class="btn big" id="hNext">Почати «${esc(S.title)}» ▶</button>
      </div>
      ${(S.rp || []).length ? `<p class="hint" style="margin:0">Зіграно раундів: ${S.rp.length}. Бали йдуть у загальний рейтинг.</p>` : ''}
      <div class="row" style="gap:8px">
        <button class="mini" id="hEdit">Змінити питання</button>
        ${(S.rp || []).length ? `<button class="mini" id="hOverall">Загальний рейтинг</button>` : ''}
        <button class="mini" id="hClose">Закрити гру</button>
      </div>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:14px;min-height:280px">
      <div class="row"><div class="count-big" id="lobbyCount">0</div><div class="muted" style="font-weight:800">гравців<br>у залі</div></div>
      <div class="players" id="lobbyPlayers"></div>
    </div>
  </div>`;
  bindHostButtons();
  $('#roundSel').onchange = e => switchRound(+e.target.value);
  const ov = $('#hOverall'); if (ov) ov.onclick = () => socket.emit('host:overall');
  $('#hEdit').onclick = () => { mode = 'hostEdit'; render(true); };
  renderLobbyPlayers();
}
function renderLobbyPlayers() {
  const box = $('#lobbyPlayers'); if (!box || !H.S) return;
  const pl = H.S.players || [];
  $('#lobbyCount').textContent = pl.filter(p => p.online).length;
  if (!pl.length) { box.innerHTML = '<span class="muted pulse">Чекаємо на гравців…</span>'; return; }
  const m = box.querySelector('.muted'); if (m) m.remove();
  const want = new Set(pl.map(p => p.pid));
  [...box.children].forEach(c => { if (!want.has(c.dataset.k)) c.remove(); });
  for (const p of pl) {
    let el = [...box.children].find(c => c.dataset.k === p.pid);
    if (!el) {
      el = document.createElement('span'); el.className = 'chip'; el.dataset.k = p.pid; box.appendChild(el);
    }
    const html = `<span class="em">${esc(p.emoji)}</span>${esc(p.nick)}<button type="button" data-kick="${esc(p.pid)}" aria-label="Прибрати ${esc(p.nick)}" title="Прибрати">×</button>`;
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.toggle('off', !p.online);
    el.title = p.online ? '' : 'Не в мережі';
  }
}
document.addEventListener('click', e => {
  const k = e.target.closest && e.target.closest('[data-kick]');
  if (k && mode === 'host') socket.emit('host:kick', k.dataset.kick);
});

/* ---------- timer ring + live numbers ---------- */
const R = 40, CIRC = 2 * Math.PI * R;
function ringHTML() {
  return `<div class="ring" id="ring"><svg viewBox="0 0 92 92"><circle class="bg" cx="46" cy="46" r="${R}"/><circle class="fg" cx="46" cy="46" r="${R}" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/></svg><div class="num">–</div></div>`;
}
function refresh() {
  const ring = $('#ring');
  if (ring && lim) {
    const rem = Math.max(0, deadline - Date.now());
    const sec = Math.ceil(rem / 1000);
    ring.querySelector('.num').textContent = sec;
    ring.querySelector('.fg').setAttribute('stroke-dashoffset', String(CIRC * (1 - rem / lim)));
    ring.classList.toggle('low', sec <= 5);
  }
  if (mode === 'host' && H.S) {
    const ac = $('#ansCount'); if (ac) ac.textContent = H.S.answered;
    const pc = $('#plCount'); if (pc) pc.textContent = onlineCount();
    const hc = $('#hdrCount'); if (hc) hc.textContent = onlineCount();
    if (H.S.phase === 'lobby') renderLobbyPlayers();
  }
}
setInterval(refresh, 200);

document.addEventListener('keydown', e => {
  if (mode !== 'host' || e.target.matches('input,textarea,select')) return;
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
    const b = $('#hNext'); if (b && H.S && H.S.phase !== 'question') { e.preventDefault(); b.click(); }
  }
});

/* ---------- confetti ---------- */
let confettiOn = false;
function confetti() {
  if (confettiOn || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confettiOn = true;
  const c = $('#confetti'), x = c.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#E8458B', '#2B3BB5', '#F2542D', '#F5C443', '#A4B92F', '#F7BED3'];
  const ps = Array.from({ length: 160 }, () => ({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  (function f(t) {
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += .03; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); }
    if (t - t0 < 5000) requestAnimationFrame(f); else { x.clearRect(0, 0, innerWidth, innerHeight); confettiOn = false; }
  })(t0);
}

render(true);
})();
