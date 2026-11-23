'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000, maxHttpBufferSize: 200000 });

const PUBLIC = path.join(__dirname, 'public');
app.use(express.static(PUBLIC));
app.get('/host', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
app.get('/healthz', (req, res) => res.send('ok'));
app.get('/qr.svg', async (req, res) => {
  const t = String(req.query.t || '').slice(0, 300);
  if (!t) return res.status(400).end();
  try {
    const svg = await QRCode.toString(t, { type: 'svg', margin: 1, color: { dark: '#0A0F1F', light: '#F4F1EA' } });
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=3600').send(svg);
  } catch { res.status(400).end(); }
});

/* ---------------- game model ---------------- */
const LIM = { q: 200, o: 90, nick: 16, questions: 100, players: 300 };
const READY_MS = 3500;
const games = new Map();
const rid = n => crypto.randomBytes(n).toString('hex');
function newPin() { let p; do { p = String(crypto.randomInt(100000, 1000000)); } while (games.has(p)); return p; }

function cleanQuestions(qs) {
  if (!Array.isArray(qs)) return [];
  return qs.slice(0, LIM.questions).map(q => {
    q = q || {};
    const options = (Array.isArray(q.options) ? q.options : []).slice(0, 4).map(o => String(o ?? '').trim().slice(0, LIM.o));
    while (options.length < 4) options.push('');
    const correct = Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4 ? q.correct : 0;
    const time = Math.min(120, Math.max(5, parseInt(q.time, 10) || 20));
    return { text: String(q.text ?? '').trim().slice(0, LIM.q), options, correct, time };
  }).filter(q => q.text && q.options.filter(Boolean).length >= 2 && q.options[q.correct]);
}

const cleanTitle = t => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Квіз';
function createGame(questions, hostSocketId, title) {
  const g = {
    pin: newPin(), hostToken: rid(16), hostSocket: hostSocketId, questions, title: cleanTitle(title), roundsPlayed: [],
    phase: 'lobby', qi: -1, players: new Map(), answers: new Map(), counts: [0, 0, 0, 0],
    startedAt: 0, deadline: 0, readyEnd: 0, limitMs: 0, timer: null, touched: Date.now()
  };
  games.set(g.pin, g);
  return g;
}
const cur = g => g.questions[g.qi];
const ranked = g => [...g.players.values()].sort((a, b) => b.score - a.score || a.nick.localeCompare(b.nick));
const overallOf = p => Object.values(p.rounds).reduce((a, b) => a + b, 0);
const hasHistory = p => Object.keys(p.rounds).length > 0;
const rankedOverall = g => [...g.players.values()].sort((a, b) => overallOf(b) - overallOf(a) || a.nick.localeCompare(b.nick));
const pubPlayer = p => ({ pid: p.pid, nick: p.nick, emoji: p.emoji, score: p.score, delta: p.delta, overall: overallOf(p), online: !!p.socketId });

function baseView(g) {
  const v = { pin: g.pin, phase: g.phase, qi: g.qi, n: g.questions.length, title: g.title, rp: g.roundsPlayed.slice(-20) };
  const q = cur(g);
  if (q && ['ready', 'question', 'reveal'].includes(g.phase)) {
    v.q = { t: q.text, o: g.phase === 'ready' ? [] : q.options, lim: q.time };
  }
  if (g.phase === 'ready') v.rem = Math.max(0, g.readyEnd - Date.now());
  if (g.phase === 'question') v.rem = Math.max(0, g.deadline - Date.now());
  if (g.phase === 'reveal') { v.c = q.correct; v.counts = g.counts; }
  return v;
}
function hostView(g) {
  const v = baseView(g);
  v.answered = g.answers.size;
  const r = ranked(g);
  v.players = (g.phase === 'lobby' ? [...g.players.values()] : r).map(pubPlayer);
  if (g.phase === 'board') v.top = r.slice(0, 5).map(pubPlayer);
  if (g.phase === 'final') v.top = r.slice(0, 8).map(pubPlayer);
  if (g.phase === 'overall') v.top = rankedOverall(g).slice(0, 10).map(pubPlayer);
  return v;
}
function playerView(g, p, rankOf, total) {
  const v = baseView(g);
  v.pl = total;
  const a = g.answers.get(p.pid);
  v.me = { nick: p.nick, emoji: p.emoji, score: p.score, delta: p.delta, correct: p.correct, rank: rankOf.get(p.pid), total, answered: !!a, choice: a ? a.c : null };
  const ro = rankedOverall(g);
  v.me.overall = overallOf(p); v.me.overallRank = ro.indexOf(p) + 1;
  return v;
}
function sendHost(g) { if (g.hostSocket) io.to(g.hostSocket).emit('host:state', hostView(g)); }
function sendPlayer(g, p) {
  if (!p.socketId) return;
  const r = ranked(g); const rankOf = new Map(r.map((x, i) => [x.pid, i + 1]));
  io.to(p.socketId).emit('state', playerView(g, p, rankOf, r.length));
}
function broadcast(g) {
  g.touched = Date.now();
  sendHost(g);
  const r = ranked(g); const rankOf = new Map(r.map((x, i) => [x.pid, i + 1]));
  for (const p of g.players.values()) if (p.socketId) io.to(p.socketId).emit('state', playerView(g, p, rankOf, r.length));
}
function setTimer(g, ms, fn) { clearTimeout(g.timer); g.timer = setTimeout(fn, ms); }

function startGame(g) {
  for (const p of g.players.values()) { p.score = 0; p.delta = 0; p.correct = false; }
  g.qi = -1;
  nextQuestion(g);
}
function nextQuestion(g) {
  g.qi++;
  if (g.qi >= g.questions.length) return finalScreen(g);
  g.phase = 'ready'; g.answers = new Map(); g.counts = [0, 0, 0, 0];
  g.readyEnd = Date.now() + READY_MS;
  setTimer(g, READY_MS, () => openQuestion(g));
  broadcast(g);
}
function openQuestion(g) {
  if (g.phase !== 'ready') return;
  g.phase = 'question'; g.limitMs = cur(g).time * 1000;
  g.startedAt = Date.now(); g.deadline = g.startedAt + g.limitMs;
  setTimer(g, g.limitMs + 250, () => reveal(g));
  broadcast(g);
}
function reveal(g) {
  if (g.phase !== 'question') return;
  clearTimeout(g.timer);
  const q = cur(g);
  g.phase = 'reveal'; g.counts = [0, 0, 0, 0];
  for (const p of g.players.values()) {
    const a = g.answers.get(p.pid);
    if (a) g.counts[a.c]++;
    const ok = !!a && a.c === q.correct;
    const pts = ok ? Math.round(1000 * (1 - 0.5 * Math.min(a.t, g.limitMs) / g.limitMs)) : 0;
    p.delta = pts; p.score += pts; p.correct = ok;
  }
  broadcast(g);
}
function boardScreen(g) { g.phase = 'board'; broadcast(g); }
function finalScreen(g) {
  clearTimeout(g.timer); g.phase = 'final';
  // the round's result counts toward the overall ranking; replaying a round replaces its result
  for (const p of g.players.values()) p.rounds[g.title] = p.score;
  if (!g.roundsPlayed.includes(g.title)) g.roundsPlayed.push(g.title);
  broadcast(g);
}
function overallScreen(g) { clearTimeout(g.timer); g.phase = 'overall'; broadcast(g); }
function resetOverall(g) {
  g.roundsPlayed = [];
  for (const [pid, p] of g.players) { p.rounds = {}; if (!p.socketId) g.players.delete(pid); }
  broadcast(g);
}
function toLobby(g) {
  clearTimeout(g.timer);
  g.phase = 'lobby'; g.qi = -1; g.answers = new Map();
  for (const [pid, p] of g.players) { if (!p.socketId && !hasHistory(p)) g.players.delete(pid); else { p.score = 0; p.delta = 0; p.correct = false; } }
  broadcast(g);
}
function maybeAllAnswered(g) {
  if (g.phase !== 'question') return;
  const active = [...g.players.values()].filter(p => p.socketId);
  if (active.length && active.every(p => g.answers.has(p.pid))) reveal(g);
}
function closeGame(g) {
  clearTimeout(g.timer);
  for (const p of g.players.values()) if (p.socketId) io.to(p.socketId).emit('closed');
  games.delete(g.pin);
}

/* ---------------- sockets ---------------- */
io.on('connection', socket => {
  socket.data = {};
  const reply = (ack, v) => { if (typeof ack === 'function') ack(v); };
  const myHostGame = () => {
    const g = games.get(socket.data.pin);
    return g && socket.data.role === 'host' && g.hostSocket === socket.id ? g : null;
  };
  const myPlayer = () => {
    const g = games.get(socket.data.pin);
    if (!g || socket.data.role !== 'player') return [null, null];
    const p = g.players.get(socket.data.pid);
    return p && p.socketId === socket.id ? [g, p] : [null, null];
  };

  socket.on('host:create', (d, ack) => {
    const qs = cleanQuestions(d && d.questions);
    if (!qs.length) return reply(ack, { error: 'Немає жодного повного питання.' });
    const g = createGame(qs, socket.id, d && d.title);
    socket.data = { role: 'host', pin: g.pin };
    reply(ack, { pin: g.pin, hostToken: g.hostToken });
    broadcast(g);
  });
  socket.on('host:resume', (d, ack) => {
    const g = d && games.get(String(d.pin));
    if (!g || g.hostToken !== d.hostToken) return reply(ack, { error: 'gone' });
    if (g.hostSocket && g.hostSocket !== socket.id) io.to(g.hostSocket).emit('host:replaced');
    g.hostSocket = socket.id;
    socket.data = { role: 'host', pin: g.pin };
    reply(ack, { ok: true, pin: g.pin });
    broadcast(g);
  });
  socket.on('host:questions', (d, ack) => {
    const g = myHostGame(); if (!g) return reply(ack, { error: 'Гру не знайдено.' });
    if (g.phase !== 'lobby') return reply(ack, { error: 'Питання можна змінити лише в лобі.' });
    const qs = cleanQuestions(d && d.questions);
    if (!qs.length) return reply(ack, { error: 'Немає жодного повного питання.' });
    g.questions = qs; g.title = cleanTitle(d && d.title); reply(ack, { ok: true, n: qs.length }); broadcast(g);
  });
  socket.on('host:next', () => {
    const g = myHostGame(); if (!g) return;
    if (g.phase === 'lobby') return startGame(g);
    if (g.phase === 'question') return reveal(g);
    if (g.phase === 'reveal') return boardScreen(g);
    if (g.phase === 'board') return nextQuestion(g);
    if (g.phase === 'final' || g.phase === 'overall') return toLobby(g);
  });
  socket.on('host:overall', () => { const g = myHostGame(); if (g && ['lobby', 'final', 'overall'].includes(g.phase)) overallScreen(g); });
  socket.on('host:resetOverall', () => { const g = myHostGame(); if (g && ['lobby', 'overall'].includes(g.phase)) resetOverall(g); });
  socket.on('host:end', () => { const g = myHostGame(); if (g) toLobby(g); });
  socket.on('host:close', () => { const g = myHostGame(); if (g) closeGame(g); socket.data = {}; });
  socket.on('host:kick', pid => {
    const g = myHostGame(); if (!g) return;
    const p = g.players.get(String(pid)); if (!p) return;
    if (p.socketId) io.to(p.socketId).emit('kicked', { reason: 'Ведучий прибрав вас із гри.' });
    g.players.delete(p.pid); g.answers.delete(p.pid);
    broadcast(g); maybeAllAnswered(g);
  });

  socket.on('player:join', (d, ack) => {
    d = d || {};
    const g = games.get(String(d.pin || '').replace(/\D/g, ''));
    if (!g) return reply(ack, { error: 'Гру з таким PIN не знайдено. Перевірте цифри.' });
    const nick = String(d.nick || '').replace(/\s+/g, ' ').trim().slice(0, LIM.nick);
    const emoji = String(d.emoji || '🙂').slice(0, 8);
    let p = d.pid ? g.players.get(String(d.pid)) : null;
    if (!p) {
      if (!nick) return reply(ack, { error: 'Введіть нікнейм.' });
      const same = [...g.players.values()].find(x => x.nick.toLowerCase() === nick.toLowerCase());
      if (same && same.socketId) return reply(ack, { error: 'Це ім\'я вже зайняте. Оберіть інше.' });
      if (same) p = same; // the same person coming back (e.g. a new phone): keep their points
    }
    if (!p) {
      if (g.players.size >= LIM.players) return reply(ack, { error: 'У грі вже максимум гравців.' });
      p = { pid: rid(8), nick, emoji, score: 0, delta: 0, correct: false, socketId: null, rounds: {} };
      g.players.set(p.pid, p);
    } else {
      p.emoji = emoji;
    }
    if (p.socketId && p.socketId !== socket.id) io.to(p.socketId).emit('kicked', { reason: 'Гру відкрито в іншій вкладці.' });
    p.socketId = socket.id;
    socket.data = { role: 'player', pin: g.pin, pid: p.pid };
    reply(ack, { pid: p.pid, nick: p.nick, pin: g.pin });
    broadcast(g);
  });
  socket.on('player:answer', c => {
    const [g, p] = myPlayer(); if (!g) return;
    c = Number(c);
    if (g.phase !== 'question' || g.answers.has(p.pid)) return;
    if (!Number.isInteger(c) || c < 0 || c > 3 || !cur(g).options[c]) return;
    const now = Date.now();
    if (now > g.deadline + 250) return;
    g.answers.set(p.pid, { c, t: Math.max(0, now - g.startedAt) });
    sendHost(g); sendPlayer(g, p);
    maybeAllAnswered(g);
  });
  socket.on('player:leave', () => {
    const [g, p] = myPlayer(); if (!g) return;
    g.players.delete(p.pid); g.answers.delete(p.pid); socket.data = {};
    broadcast(g); maybeAllAnswered(g);
  });

  socket.on('disconnect', () => {
    const { role, pin, pid } = socket.data;
    const g = games.get(pin); if (!g) return;
    if (role === 'host' && g.hostSocket === socket.id) { g.hostSocket = null; return; }
    if (role === 'player') {
      const p = g.players.get(pid);
      if (!p || p.socketId !== socket.id) return;
      if (g.phase === 'lobby' && !hasHistory(p)) g.players.delete(pid); else p.socketId = null;
      broadcast(g); maybeAllAnswered(g);
    }
  });
});

// Видаляємо ігри, у яких нічого не відбувалося 6 годин
setInterval(() => {
  const cutoff = Date.now() - 6 * 3600 * 1000;
  for (const g of games.values()) if (g.touched < cutoff) closeGame(g);
}, 10 * 60 * 1000).unref();

server.listen(PORT, () => console.log(`Квіз-Сцена працює на http://localhost:${PORT}`));
