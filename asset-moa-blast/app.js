/* 자산모아 블럭모아 Blast — 게임 엔진 + 학습 레이어
   8×8 보드 · 조각 3개 드래그 · 줄 터짐 · 콤보 · 분개 미션 · 보석 상점 · 보석 챌린지 */
(function () {
  'use strict';
  const D = window.BlasterData;
  if (!D) { document.body.innerHTML = '<p style="padding:20px">데이터를 불러오지 못했어요.</p>'; return; }
  const ACCT = D.ACCOUNTS;
  const SOUND = window.MoaSound || { play: function () {}, start: function () {}, isOn: function () { return true; }, set: function () {} };

  /* ───────── 저장 ───────── */
  const KEY = 'moaBlast.v1';
  const DEF = { gems: 30, stars: {}, best: 0, wrong: [], last: { corner: 'inv', stage: 1 }, scores: [], music: true };
  let SAVE = load();
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign({}, DEF, raw, {
        stars: Object.assign({}, raw.stars || {}),
        wrong: Array.isArray(raw.wrong) ? raw.wrong : [],
        scores: Array.isArray(raw.scores) ? raw.scores : []
      });
    } catch (e) { return Object.assign({}, DEF); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) {} }
  function addGems(n) { SAVE.gems = Math.max(0, SAVE.gems + n); save(); paintGems(); }

  /* ───────── DOM ───────── */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  const boardEl = $('#board'), trayEl = $('#tray'), journalEl = $('#journal');
  const missionTextEl = $('#missionText'), missionProgEl = $('#missionProgress');
  const dragLayer = $('#dragLayer'), toastEl = $('#toast');

  function show(id) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }
  function bubble(msg) {
    const host = $('#bubbles');
    const b = document.createElement('div');
    b.className = 'speech bubble-float';
    b.textContent = msg;
    host.appendChild(b);
    setTimeout(() => b.remove(), 2200);
  }
  function won(n) { return Number(n).toLocaleString('ko-KR'); }
  function paintGems() {
    ['#homeGems', '#stagesGems', '#playGems', '#chGems', '#shopGems', '#rankGems', '#bookGems'].forEach((s) => {
      const el = $(s + ' b'); if (el) el.textContent = SAVE.gems;
    });
  }

  /* ───────── 계정 색/분류 ───────── */
  function catClass(name) {
    const a = ACCT[name];
    if (!a) return 'c-pick';
    if (String(a.kind).indexOf('차감') >= 0) return 'c-assetchi';
    if (a.kind === '부채') return 'c-liab';
    if (a.kind === '비용') return 'c-cost';
    if (a.kind === '수익') return 'c-rev';
    return 'c-asset';
  }
  function isAccount(name) { return !!ACCT[name]; }
  function sideOf(name) { return ACCT[name] ? (ACCT[name].inc === '대변' ? 'c' : 'd') : null; }

  /* ───────── 조각 모양 카탈로그 ───────── */
  const SHAPES = [
    { n: '1', c: [[0, 0]] },
    { n: '2가로', c: [[0, 0], [0, 1]] },
    { n: '2세로', c: [[0, 0], [1, 0]] },
    { n: '3가로', c: [[0, 0], [0, 1], [0, 2]] },
    { n: '3세로', c: [[0, 0], [1, 0], [2, 0]] },
    { n: '4가로', c: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { n: '4세로', c: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { n: '5가로', c: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { n: '5세로', c: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    { n: '2x2', c: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { n: '2x3', c: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
    { n: '3x2', c: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
    { n: '3x3', c: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
    { n: 'ㄱ', c: [[0, 0], [1, 0], [1, 1], [1, 2]] },
    { n: 'ㄴ', c: [[0, 2], [1, 0], [1, 1], [1, 2]] },
    { n: '역ㄱ', c: [[0, 0], [0, 1], [0, 2], [1, 0]] },
    { n: '역ㄴ', c: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { n: 'T', c: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { n: '역T', c: [[1, 0], [1, 1], [1, 2], [0, 1]] },
    { n: '+', c: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
    { n: 'Z', c: [[0, 0], [0, 1], [1, 1], [1, 2]] },
    { n: 'S', c: [[0, 1], [0, 2], [1, 0], [1, 1]] },
    { n: '대각2', c: [[0, 0], [1, 1]] },
    { n: '대각3', c: [[0, 0], [1, 1], [2, 2]] },
    { n: '코너3', c: [[0, 0], [1, 0], [1, 1]] },
    { n: '코너3b', c: [[0, 0], [0, 1], [1, 1]] }
  ];
  const SMALL = SHAPES.filter((s) => s.c.length <= 3);

  function shapeWeighted() {
    // 큰 조각은 조금 덜, 작은 조각은 조금 더 (막힘 방지)
    const bag = [];
    SHAPES.forEach((s) => {
      const w = s.c.length <= 2 ? 3 : s.c.length <= 4 ? 4 : s.c.length <= 6 ? 2 : 1;
      for (let i = 0; i < w; i++) bag.push(s);
    });
    return bag[Math.floor(Math.random() * bag.length)];
  }
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

  /* ───────── 플레이 상태 ───────── */
  let P = null;
  const N = 8;

  function buildMission(st) {
    if (st.mode === 'pick') {
      return [{ side: 'any', account: st.picks[0].label, amount: null, filled: false }];
    }
    return st.entries.map((e) => ({ side: e.side, account: e.account, amount: e.amount, filled: false }));
  }
  function buildObstacles(stageNo, rng) {
    const set = new Set();
    const count = Math.min(8, Math.floor(stageNo / 7));
    let guard = 0;
    while (set.size < count && guard++ < 200) {
      const i = Math.floor(Math.random() * 64);
      const r = Math.floor(i / 8), c = i % 8;
      // 미션 조각이 들어갈 자리를 막지 않도록 좌우 각각 최소 6칸은 비워 둔다
      if (set.has(i)) continue;
      set.add(i);
    }
    return set;
  }

  function emptyGrid() { return new Array(64).fill(null); }
  function idx(r, c) { return r * N + c; }
  function isFree(cell) { return !cell; }

  function cellsFor(piece, r0, c0) {
    return piece.cells.map(([r, c]) => [r0 + r, c0 + c]);
  }
  function canPlace(piece, r0, c0, grid, obst) {
    for (const [r, c] of cellsFor(piece, r0, c0)) {
      if (r < 0 || r >= N || c < 0 || c >= N) return false;
      const i = idx(r, c);
      if (grid[i] || (obst && obst.has(i))) return false;
    }
    return true;
  }
  function inSide(piece, r0, c0, side) {
    if (side === 'any') return true;
    for (const [r, c] of cellsFor(piece, r0, c0)) {
      if (side === 'd' && c > 3) return false;
      if (side === 'c' && c < 4) return false;
    }
    return true;
  }
  function placements(piece, grid, obst, side) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (canPlace(piece, r, c, grid, obst) && inSide(piece, r0(r), r0(c), side)) out.push([r, c]);
    }
    return out;
    function r0(v) { return v; }
  }

  function newPiece(key, sideHint) {
    const isAcc = isAccount(key);
    const cat = isAcc ? catClass(key) : 'c-pick';
    // 미션 조각은 작은 모양 위주로(존에 들어가기 쉽게)
    const useSmall = !!sideHint;
    let guard = 0;
    while (guard++ < 40) {
      const sp = useSmall ? pickOne(SMALL.concat(SHAPES.filter((s) => s.c.length <= 4))) : shapeWeighted();
      const pc = { key: key, cat: cat, cells: sp.c, shape: sp.n, side: sideHint || null, id: Math.random().toString(36).slice(2) };
      if (!P) return pc;
      const side = sideHint || 'any';
      if (placements(pc, P.grid, P.obst, side).length) return pc;
    }
    return { key: key, cat: cat, cells: SHAPES[0].c, shape: '1', side: sideHint || null, id: Math.random().toString(36).slice(2) };
  }

  function decoyKeys(st, n) {
    const used = P.mission.map((m) => m.account);
    let pool;
    if (st.mode === 'pick') {
      pool = (st.decoys || []).map((x) => x.label);
    } else {
      const sameKind = [];
      P.mission.forEach((m) => {
        const a = ACCT[m.account];
        if (!a) return;
        Object.keys(ACCT).forEach((k) => {
          if (ACCT[k].kind === a.kind && used.indexOf(k) < 0) sameKind.push(k);
        });
      });
      pool = sameKind.concat(Object.keys(ACCT).filter((k) => used.indexOf(k) < 0));
      pool = shuffle(pool);
    }
    const out = [];
    for (const k of shuffle(pool)) {
      if (out.length >= n) break;
      if (out.indexOf(k) < 0) out.push(k);
    }
    return out;
  }

  function refillTray() {
    const open = P.mission.filter((m) => !m.filled);
    const want = shuffle(open).slice(0, Math.min(2, open.length));
    const tray = [];
    want.forEach((m) => {
      const side = m.side === 'any' ? 'any' : m.side;
      tray.push(newPiece(m.account, side));
    });
    const decoys = decoyKeys(P.st, 3 - tray.length);
    decoys.forEach((k) => tray.push(newPiece(k, null)));
    P.tray = shuffle(tray).slice(0, 3);
    renderTray();
  }

  function anyTrayFits() {
    return P.tray.some((p) => p && placements(p, P.grid, P.obst, 'any').length > 0);
  }

  /* ───────── 렌더 ───────── */
  function renderBoard(animSet) {
    boardEl.innerHTML = '';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = idx(r, c), v = P.grid[i];
      const d = document.createElement('div');
      d.className = 'cell ' + (c < 4 ? 'debit' : 'credit');
      d.dataset.i = String(i);
      if (P.obst.has(i)) d.classList.add('obstacle');
      else if (v) {
        const b = document.createElement('div');
        b.className = 'blk ' + v.cat + (v.sealed ? ' sealed' : '');
        const s = document.createElement('span');
        s.textContent = v.key;
        b.appendChild(s);
        d.appendChild(b);
        if (animSet && animSet.has(i)) { b.classList.add('drop-anim'); }
      }
      boardEl.appendChild(d);
    }
  }

  function trayCell() { return window.innerWidth <= 380 ? 15 : window.innerWidth <= 420 ? 16 : 18; }

  function renderTray() {
    trayEl.innerHTML = '';
    const cs = trayCell();
    let any = false;
    P.tray.forEach((pc, si) => {
      const wrap = document.createElement('div');
      wrap.className = 'slot-piece';
      if (!pc) { trayEl.appendChild(wrap); return; }
      any = true;
      const el = document.createElement('div');
      el.className = 'piece';
      el.dataset.slot = String(si);
      const rows = Math.max.apply(null, pc.cells.map((x) => x[0])) + 1;
      const cols = Math.max.apply(null, pc.cells.map((x) => x[1])) + 1;
      el.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cs + 'px)';
      el.style.gridTemplateRows = 'repeat(' + rows + ', ' + cs + 'px)';
      const map = {};
      pc.cells.forEach(([r, c]) => { map[r + ':' + c] = 1; });
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        if (map[r + ':' + c]) {
          cell.className = 'pcell ' + pc.cat;
          if (r === 0 && c === 0) { cell.classList.add('lbl'); cell.textContent = pc.key.length > 4 ? pc.key.slice(0, 4) : pc.key; }
        } else cell.style.visibility = 'hidden';
        el.appendChild(cell);
      }
      wrap.appendChild(el);
      trayEl.appendChild(wrap);
    });
    if (!any) {
      const d = document.createElement('div');
      d.className = 'tray-empty';
      d.textContent = '조각을 불러오는 중…';
      trayEl.appendChild(d);
    }
  }

  function renderMission() {
    const st = P.st;
    missionTextEl.textContent = st.prompt;
    journalEl.innerHTML = '';
    if (st.mode === 'pick') {
      const col = document.createElement('div');
      col.className = 'jcol debit';
      col.style.gridColumn = 'span 2';
      col.innerHTML = '<div class="jhead"><span>정답</span><span>' + (st.tag || '개념') + '</span></div>';
      const slot = document.createElement('div');
      slot.className = 'jslot' + (P.mission[0].filled ? ' filled' : '');
      slot.innerHTML = P.mission[0].filled
        ? '<span>' + P.mission[0].account + '</span>'
        : '<span>?</span><span class="amt">보기 중에서</span>';
      col.appendChild(slot);
      journalEl.appendChild(col);
    } else {
      ['d', 'c'].forEach((side) => {
        const col = document.createElement('div');
        col.className = 'jcol ' + (side === 'd' ? 'debit' : 'credit');
        const list = P.mission.filter((m) => m.side === side);
        const total = list.reduce((a, b) => a + (b.amount || 0), 0);
        col.innerHTML = '<div class="jhead"><span>' + (side === 'd' ? '차변' : '대변') + '</span><span>' + won(total) + '원</span></div>';
        if (!list.length) {
          col.innerHTML += '<div class="jslot"><span>—</span></div>';
        }
        list.forEach((m) => {
          const slot = document.createElement('div');
          slot.className = 'jslot' + (m.filled ? ' filled' : '');
          slot.dataset.acc = m.account;
          slot.innerHTML = m.filled
            ? '<span>' + m.account + '</span><span class="amt">' + won(m.amount) + '</span>'
            : '<span>?</span><span class="amt">' + won(m.amount) + '</span>';
          col.appendChild(slot);
        });
        journalEl.appendChild(col);
      });
    }
    const done = P.mission.filter((m) => m.filled).length;
    missionProgEl.innerHTML = P.mission.map((m) => '<i class="' + (m.filled ? 'on' : '') + '"></i>').join('');
    $('#playScore').textContent = won(P.score);
    $('#playStageLabel').textContent = cornerName(P.cornerKey) + ' ' + P.stageNo + '단계 · ' + done + '/' + P.mission.length;
  }

  function cornerName(key) {
    const c = D.CORNERS.filter((x) => x.key === key)[0];
    return c ? c.name : '';
  }

  /* ───────── 드래그 ───────── */
  let drag = null;

  function metrics() {
    const cells = boardEl.querySelectorAll('.cell');
    if (!cells.length) return null;
    const r0 = cells[0].getBoundingClientRect();
    const r1 = cells[1].getBoundingClientRect();
    return { size: r0.width, stride: r1.left - r0.left, top: r0.top, left: r0.left };
  }
  function cellAtPoint(x, y) {
    const m = metrics(); if (!m) return null;
    const c = Math.round((x - m.left) / m.stride);
    const r = Math.round((y - m.top) / m.stride);
    if (r < 0 || r >= N || c < 0 || c >= N) return { r: r, c: c, outside: true };
    return { r: r, c: c };
  }

  trayEl.addEventListener('pointerdown', function (e) {
    const pEl = e.target.closest('.piece');
    if (!pEl || !P || P.over || P.done) return;
    const si = Number(pEl.dataset.slot);
    const pc = P.tray[si];
    if (!pc) return;
    e.preventDefault();
    const m = metrics(); if (!m) return;
    const rect = pEl.getBoundingClientRect();
    const offR = Math.round((e.clientY - rect.top) / m.stride);
    const offC = Math.round((e.clientX - rect.left) / m.stride);
    drag = { piece: pc, slot: si, offR: offR, offC: offC, ghost: null, preview: [] };
    buildGhost(pc, e.clientX, e.clientY, m);
    pEl.classList.add('gone');
    moveDrag(e.clientX, e.clientY);
    try { pEl.setPointerCapture(e.pointerId); } catch (err) {}
  });

  function buildGhost(pc, x, y, m) {
    const g = document.createElement('div');
    g.className = 'piece';
    const rows = Math.max.apply(null, pc.cells.map((a) => a[0])) + 1;
    const cols = Math.max.apply(null, pc.cells.map((a) => a[1])) + 1;
    const s = Math.round(m.size);
    g.style.gridTemplateColumns = 'repeat(' + cols + ', ' + s + 'px)';
    g.style.gridTemplateRows = 'repeat(' + rows + ', ' + s + 'px)';
    g.style.gap = '3px';
    g.style.position = 'fixed';
    g.style.pointerEvents = 'none';
    g.style.zIndex = '70';
    const map = {};
    pc.cells.forEach(([r, c]) => { map[r + ':' + c] = 1; });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = document.createElement('div');
      if (map[r + ':' + c]) {
        d.className = 'blk ' + pc.cat;
        d.style.position = 'relative';
        d.style.borderRadius = '7px';
        const sp = document.createElement('span');
        sp.textContent = pc.key;
        d.appendChild(sp);
      } else d.style.visibility = 'hidden';
      g.appendChild(d);
    }
    dragLayer.appendChild(g);
    drag.ghost = g;
    drag.size = s;
  }

  function moveDrag(x, y) {
    if (!drag) return;
    const m = metrics(); if (!m) return;
    const s = m.size;
    const gx = x - (drag.offC + 0.5) * s - (m.stride - s) / 2;
    const gy = y - (drag.offR + 0.5) * s - (m.stride - s) / 2;
    drag.ghost.style.left = gx + 'px';
    drag.ghost.style.top = gy + 'px';
    const at = cellAtPoint(x, y);
    clearPreview();
    if (!at) return;
    const r0 = at.r - drag.offR, c0 = at.c - drag.offC;
    const ok = canPlace(drag.piece, r0, c0, P.grid, P.obst);
    drag.target = ok ? { r: r0, c: c0 } : null;
    cellsFor(drag.piece, r0, c0).forEach(([r, c]) => {
      if (r < 0 || r >= N || c < 0 || c >= N) return;
      const el = boardEl.querySelector('.cell[data-i="' + idx(r, c) + '"]');
      if (el) el.classList.add(ok ? 'preview-ok' : 'preview-bad');
    });
  }
  function clearPreview() {
    boardEl.querySelectorAll('.preview-ok,.preview-bad').forEach((el) => el.classList.remove('preview-ok', 'preview-bad'));
  }

  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  }, { passive: false });

  document.addEventListener('pointerup', function (e) {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) d.ghost.remove();
    clearPreview();
    const pieceEl = trayEl.querySelector('.piece[data-slot="' + d.slot + '"]');
    if (pieceEl) pieceEl.classList.remove('gone');
    if (d.target) tryPlace(d.piece, d.slot, d.target.r, d.target.c);
  });
  document.addEventListener('pointercancel', function () {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) d.ghost.remove();
    clearPreview();
    const pieceEl = trayEl.querySelector('.piece[data-slot="' + d.slot + '"]');
    if (pieceEl) pieceEl.classList.remove('gone');
  });

  /* ───────── 배치 ───────── */
  function tryPlace(piece, slot, r0, c0) {
    if (!canPlace(piece, r0, c0, P.grid, P.obst)) return;
    const miss = P.mission.filter((m) => !m.filled && m.account === piece.key)[0];
    const sideForPiece = miss ? miss.side : null;
    if (miss && sideForPiece !== 'any' && !inSide(piece, r0, c0, sideForPiece)) {
      // 틀린 존 → 되돌리고 힌트
      const where = sideForPiece === 'd' ? '차변' : '대변';
      const a = ACCT[piece.key];
      const hint = a ? (piece.key + '은(는) ' + where + '에 놓아요') : (piece.key + '은(는) ' + where + ' 칸이에요');
      bubble('❌ ' + hint);
      toast(hint);
      SOUND.play('wrong');
      P.combo = 0;
      renderMission();
      return;
    }
    // 히스토리 저장
    P.history.push({
      grid: P.grid.slice(),
      obst: new Set(P.obst),
      mission: P.mission.map((m) => Object.assign({}, m)),
      tray: P.tray.slice(),
      score: P.score, combo: P.combo
    });
    if (P.history.length > 40) P.history.shift();

    const anim = new Set();
    cellsFor(piece, r0, c0).forEach(([r, c]) => {
      const i = idx(r, c);
      P.grid[i] = { key: piece.key, cat: piece.cat, sealed: false };
      anim.add(i);
    });
    P.tray[slot] = null;
    SOUND.play('place');

    // 미션 채움
    if (miss) {
      miss.filled = true;
      cellsFor(piece, r0, c0).forEach(([r, c]) => { P.grid[idx(r, c)].sealed = true; });
      P.score += 150;
      SOUND.play('right');
      setTimeout(() => bubble('✅ ' + piece.key + ' 자리 완성!'), 60);
      const slotEl = journalEl.querySelector('.jslot[data-acc="' + piece.key + '"]');
      if (slotEl) { slotEl.classList.add('pop'); }
      flashText('+' + 150);
    }

    renderBoard(anim);
    renderMission();
    $('#playScore').textContent = won(P.score);

    // 줄 터짐
    setTimeout(() => {
      const cleared = resolveLines();
      if (cleared.lines.length) {
        afterClear(cleared);
      } else {
        P.combo = 0;
      }
      finishTurn();
    }, 130);
  }

  function resolveLines() {
    const full = [];
    for (let r = 0; r < N; r++) {
      let ok = true;
      for (let c = 0; c < N; c++) if (!P.grid[idx(r, c)] || P.obst.has(idx(r, c))) { ok = false; break; }
      if (ok) full.push({ type: 'row', i: r });
    }
    for (let c = 0; c < N; c++) {
      let ok = true;
      for (let r = 0; r < N; r++) if (!P.grid[idx(r, c)] || P.obst.has(idx(r, c))) { ok = false; break; }
      if (ok) full.push({ type: 'col', i: c });
    }
    const cellSet = new Set();
    full.forEach((l) => {
      for (let k = 0; k < N; k++) cellSet.add(l.type === 'row' ? idx(l.i, k) : idx(k, l.i));
    });
    // 터지는 칸 표시
    const doomed = [];
    cellSet.forEach((i) => {
      const v = P.grid[i];
      if (!v) return;
      if (!v.sealed) doomed.push(i);
    });
    // 애니메이션
    doomed.forEach((i) => {
      const el = boardEl.querySelector('.cell[data-i="' + i + '"] .blk');
      if (el) { el.classList.add('clear-anim'); }
    });
    // 인접 장애물 제거
    let obstCleared = 0;
    const toRemove = new Set();
    cellSet.forEach((i) => {
      const r = Math.floor(i / 8), c = i % 8;
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => {
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) return;
        const j = idx(rr, cc);
        if (P.obst.has(j)) toRemove.add(j);
      });
    });
    toRemove.forEach((j) => { P.obst.delete(j); obstCleared++; });
    doomed.forEach((i) => { P.grid[i] = null; });
    return { lines: full, count: full.length, obstCleared: obstCleared, cells: doomed };
  }

  function afterClear(res) {
    const pts = [0, 100, 300, 600, 1000, 1400, 1800, 2200][Math.min(7, res.count)] + res.obstCleared * 50;
    P.score += pts;
    P.combo = Math.min(9, P.combo + 1);
    if (P.combo >= 2) {
      P.score += (P.combo - 1) * 50;
      const banner = $('#comboBanner');
      banner.textContent = 'COMBO ×' + P.combo;
      banner.classList.add('show');
      clearTimeout(banner._t);
      banner._t = setTimeout(() => banner.classList.remove('show'), 1100);
      SOUND.play('combo', P.combo);
    } else {
      SOUND.play('clear', res.count);
    }
    flashText('+' + pts);
    if (res.count >= 2) { fx.confetti(36); fx.firework(); }
    setTimeout(() => { renderBoard(); }, 320);
  }

  function flashText(text) {
    const d = document.createElement('div');
    d.className = 'flash-score';
    d.textContent = text;
    $('#screen-play').appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  function finishTurn() {
    if (P.done) return;
    const all = P.mission.every((m) => m.filled);
    if (all) { setTimeout(stageClear, 260); return; }
    if (P.tray.filter(Boolean).length === 0) refillTray();
    if (!anyTrayFits()) {
      setTimeout(function () {
        if (P.done) return;
        P.over = true;
        $('#overLine').textContent = '조각 3개를 놓을 자리가 없어요. 이어하기로 보드를 정리할까요?';
        $('#ovOver').hidden = false;
      }, 300);
    }
  }

  /* ───────── 스테이지 ───────── */
  function startStage(cornerKey, stageNo) {
    const st = D.STAGES[cornerKey][stageNo - 1];
    if (!st) return;
    P = {
      st: st, cornerKey: cornerKey, stageNo: stageNo,
      grid: emptyGrid(), obst: buildObstacles(stageNo),
      mission: buildMission(st), tray: [], score: 0, combo: 0,
      history: [], over: false, done: false, startedAt: Date.now()
    };
    SAVE.last = { corner: cornerKey, stage: stageNo }; save();
    renderBoard();
    refillTray();
    renderMission();
    $('#playScore').textContent = '0';
    show('screen-play');
    SOUND.start();
  }

  function stageClear() {
    if (P.done) return;
    P.done = true;
    const sec = Math.max(1, Math.round((Date.now() - P.startedAt) / 1000));
    const speed = Math.max(0, 500 - Math.max(0, sec - 25) * 8);
    const filled = P.grid.filter(Boolean).length;
    const room = Math.max(0, 40 - Math.max(0, filled - 8) * 2);
    const comboBonus = P.combo * 30;
    const total = 500 + P.score + speed + room + comboBonus;
    const stars = total >= 1400 ? 3 : total >= 900 ? 2 : 1;
    const gems = 5 + (stars - 1) * 2;
    const id = P.st.id;
    SAVE.stars[id] = Math.max(SAVE.stars[id] || 0, stars);
    SAVE.best = Math.max(SAVE.best, total);
    SAVE.scores.push({ score: total, id: id, at: Date.now() });
    SAVE.scores.sort((a, b) => b.score - a.score);
    SAVE.scores = SAVE.scores.slice(0, 20);
    SAVE.gems += gems;
    save(); paintGems();

    $('#clearStars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
    $('#clearTitle').textContent = stars === 3 ? '완벽한 분개!' : '분개 완성!';
    $('#clearScore').textContent = won(total);
    $('#clearBreakdown').innerHTML =
      '<span>기본 500</span><span>블록 ' + won(P.score) + '</span><span>속도 +' + won(speed) + '</span>' +
      '<span>여유 +' + won(room) + '</span><span>콤보 +' + won(comboBonus) + '</span><span>💎 +' + gems + '</span>';
    $('#clearJournal').innerHTML = journalHTML(P.st);
    $('#clearExplain').textContent = P.st.explain || '';
    $('#ovClear').hidden = false;

    fx.confetti(180); fx.fireworks(3);
    SOUND.play('right'); SOUND.play('applause'); SOUND.play('whistle');
    setTimeout(() => SOUND.play('boom'), 260);
  }

  function journalHTML(st) {
    if (st.mode === 'pick') {
      return '<div class="jcol debit" style="grid-column:span 2"><div class="jhead"><span>정답</span><span></span></div>' +
        '<div class="jslot filled"><span>' + st.picks[0].label + '</span></div></div>';
    }
    const side = (s, label) => {
      const rows = st.entries.filter((e) => e.side === s);
      const total = rows.reduce((a, b) => a + b.amount, 0);
      return '<div class="jcol ' + (s === 'd' ? 'debit' : 'credit') + '"><div class="jhead"><span>' + label + '</span><span>' + won(total) + '원</span></div>' +
        (rows.length ? rows.map((e) => '<div class="jslot filled"><span>' + e.account + '</span><span class="amt">' + won(e.amount) + '</span></div>').join('') : '<div class="jslot"><span>—</span></div>') +
        '</div>';
    };
    return side('d', '차변') + side('c', '대변');
  }

  /* ───────── 아이템 ───────── */
  function useItem(name) {
    if (!P || P.done) return;
    const cost = { undo: 3, clean: 8, hint: 2 }[name];
    if (SAVE.gems < cost) { toast('보석이 모자라요 (필요 💎' + cost + ')'); SOUND.play('wrong'); return; }
    if (name === 'undo') {
      const h = P.history.pop();
      if (!h) { toast('되돌릴 배치가 없어요'); return; }
      P.grid = h.grid; P.obst = h.obst; P.mission = h.mission; P.tray = h.tray; P.score = h.score; P.combo = h.combo;
      renderBoard(); renderTray(); renderMission();
    } else if (name === 'clean') {
      let removed = 0;
      P.obst.forEach((i) => { if (removed < 3) { P.obst.delete(i); removed++; } });
      [6, 7].forEach((r) => {
        for (let c = 0; c < N; c++) {
          const i = idx(r, c);
          if (P.grid[i] && !P.grid[i].sealed) P.grid[i] = null;
        }
      });
      renderBoard();
      fx.confetti(30);
    } else if (name === 'hint') {
      const open = P.mission.filter((m) => !m.filled);
      if (!open.length) { toast('이미 다 채웠어요'); return; }
      const target = open[0];
      const idxTray = P.tray.findIndex((p) => p && p.key === target.account);
      if (idxTray < 0) { toast('다음 조각에서 ' + target.account + '이 나와요'); return; }
      const pc = P.tray[idxTray];
      const spots = placements(pc, P.grid, P.obst, target.side === 'any' ? 'any' : target.side);
      if (!spots.length) { toast('놓을 자리가 없어요. 보드 정리를 써 보세요'); return; }
      const spot = spots[Math.floor(Math.random() * spots.length)];
      cellsFor(pc, spot[0], spot[1]).forEach(([r, c]) => {
        const el = boardEl.querySelector('.cell[data-i="' + idx(r, c) + '"]');
        if (el) el.classList.add('hint');
      });
      const trayEl2 = trayEl.querySelector('.piece[data-slot="' + idxTray + '"]');
      if (trayEl2) trayEl2.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 });
      setTimeout(() => boardEl.querySelectorAll('.hint').forEach((el) => el.classList.remove('hint')), 3000);
    }
    addGems(-cost);
    toast('💎' + cost + ' 사용 · 남은 ' + SAVE.gems);
    SOUND.play('gem');
  }

  /* ───────── 이펙트 ───────── */
  const fx = (function () {
    const cv = $('#fx'), ctx2 = cv.getContext('2d');
    let parts = [], raf = null, dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      const w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize); resize();
    function loop() {
      ctx2.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter((p) => p.life > 0);
      parts.forEach((p) => {
        p.life -= 1;
        p.vy += p.g;
        p.x += p.vx; p.y += p.vy;
        p.vx *= p.drag; p.vy *= p.drag;
        ctx2.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
        if (p.type === 'c') {
          ctx2.fillStyle = p.color;
          ctx2.save(); ctx2.translate(p.x, p.y); ctx2.rotate(p.rot += p.vr);
          ctx2.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
          ctx2.restore();
        } else if (p.type === 'spark') {
          ctx2.strokeStyle = p.color; ctx2.lineWidth = 2;
          ctx2.beginPath(); ctx2.moveTo(p.x, p.y); ctx2.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); ctx2.stroke();
        } else if (p.type === 'ring') {
          ctx2.strokeStyle = p.color; ctx2.lineWidth = 3 * (p.life / 50);
          ctx2.beginPath(); ctx2.arc(p.x, p.y, p.r += 4, 0, Math.PI * 2); ctx2.stroke();
        }
      });
      ctx2.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(loop);
      else { raf = null; ctx2.clearRect(0, 0, cv.width, cv.height); }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    const COLORS = ['#ffd166', '#ff7a9c', '#63e6be', '#7ec8ff', '#c79bff', '#ffe066', '#ff9f43'];
    return {
      confetti: function (n) {
        const w = cv.clientWidth, h = cv.clientHeight;
        for (let i = 0; i < (n || 60); i++) {
          parts.push({
            type: 'c', x: w / 2 + (Math.random() - 0.5) * w * 0.5, y: h * 0.32 + Math.random() * 40,
            vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 2, g: 0.28, drag: 0.99,
            s: 5 + Math.random() * 7, color: COLORS[i % COLORS.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 90 + Math.random() * 50
          });
        }
        kick();
      },
      firework: function (x, y) {
        const w = cv.clientWidth, h = cv.clientHeight;
        const cx = x == null ? w * (0.2 + Math.random() * 0.6) : x;
        const cy = y == null ? h * (0.15 + Math.random() * 0.3) : y;
        const col = COLORS[Math.floor(Math.random() * COLORS.length)];
        for (let i = 0; i < 26; i++) {
          const a = (Math.PI * 2 * i) / 26, sp = 2.5 + Math.random() * 4;
          parts.push({ type: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.06, drag: 0.96, color: col, life: 55 + Math.random() * 20 });
        }
        parts.push({ type: 'ring', x: cx, y: cy, vx: 0, vy: 0, g: 0, drag: 1, r: 4, color: '#fff', life: 40 });
        kick();
      },
      fireworks: function (n) { for (let i = 0; i < (n || 3); i++) setTimeout(() => this.firework(), i * 230); }
    };
  })();

  /* ───────── 화면: 홈 ───────── */
  function renderHome() {
    const host = $('#cornerList');
    host.innerHTML = '';
    D.CORNERS.forEach((c) => {
      const st = D.STAGES[c.key];
      const done = st.filter((s) => SAVE.stars[s.id]).length;
      const stars = st.reduce((a, s) => a + (SAVE.stars[s.id] || 0), 0);
      const el = document.createElement('button');
      el.className = 'corner';
      el.innerHTML =
        '<span class="emoji">' + c.emoji + '</span>' +
        '<span class="meta"><span class="name">' + c.name + ' <small style="font-size:10px;color:#8b93b5">★' + stars + '/' + (c.stages * 3) + '</small></span>' +
        '<span class="desc">' + c.desc + '</span>' +
        '<span class="pbar"><i style="width:' + Math.round((done / c.stages) * 100) + '%"></i></span></span>' +
        '<span class="prog">' + done + '/' + c.stages + '</span>';
      el.addEventListener('click', () => openStages(c.key));
      host.appendChild(el);
    });
    paintGems();
    const dday = $('#homeDday');
    const exam = new Date('2026-11-30T09:00:00+09:00');
    const finalExam = new Date('2026-12-14T09:00:00+09:00');
    const now = new Date();
    const target = now < exam ? exam : finalExam;
    const days = Math.max(0, Math.ceil((target - now) / 86400000));
    dday.textContent = (now < exam ? '3차 서술형평가' : '기말고사') + ' D-' + days + ' · 오늘도 3줄만!';
    const speech = ['오늘은 어떤 자산을 모아 볼까?', '블록 한 줄만 터뜨려 봐!', '차변은 왼쪽, 대변은 오른쪽이야!', '보석 모으면 다시하기가 공짜!'];
    $('#homeSpeech').textContent = speech[Math.floor(Math.random() * speech.length)];
  }

  function openStages(key) {
    const c = D.CORNERS.filter((x) => x.key === key)[0];
    const sts = D.STAGES[key];
    $('#stagesTitle').textContent = c.emoji + ' ' + c.name;
    $('#stagesDesc').textContent = c.desc + ' · ' + c.stages + '단계';
    const grid = $('#stageGrid');
    grid.innerHTML = '';
    sts.forEach((s) => {
      const b = document.createElement('button');
      const stars = SAVE.stars[s.id] || 0;
      const prev = s.stage === 1 ? true : !!SAVE.stars[sts[s.stage - 2].id];
      b.className = 'stage' + (stars ? ' done' : '') + (prev ? '' : ' locked');
      b.innerHTML = '<span class="st">' + (stars ? '★'.repeat(stars) : '') + '</span><span>' + s.stage + '</span>' +
        (D.EXAM[s.gen] ? '<span class="exam">3차</span>' : '');
      b.addEventListener('click', () => {
        if (!prev) { toast('이전 단계를 먼저 클리어해 주세요'); SOUND.play('wrong'); return; }
        startStage(key, s.stage);
      });
      grid.appendChild(b);
    });
    show('screen-stages');
  }

  /* ───────── 보석 챌린지 ───────── */
  let CH = null;
  function challengeStage() {
    if (P && P.st) return P.st;
    const last = SAVE.last || { corner: 'inv', stage: 1 };
    return D.STAGES[last.corner][Math.min(last.stage, D.STAGES[last.corner].length) - 1];
  }
  function makeChallenge() {
    const st = challengeStage();
    const kindRoll = Math.random();
    if (st.mode === 'pick') {
      const opts = shuffle([{ label: st.picks[0].label, ok: true }].concat((st.decoys || []).map((d) => ({ label: d.label, ok: false })))).slice(0, 4);
      return { st: st, type: 'choice', q: st.prompt, opts: opts, answer: st.picks[0].label, tag: st.tag || '개념', hint: '보기 중 정답을 골라요' };
    }
    const entries = st.entries;
    const pickEntry = entries[Math.floor(Math.random() * entries.length)];
    if (kindRoll < 0.34) {
      const target = pickOne(entries);
      const opts = shuffle([{ label: target.account, ok: true }].concat(accountOptions(target.account, 3).map((a) => ({ label: a, ok: false }))));
      return {
        st: st, type: 'choice',
        q: (target.side === 'd' ? '차변' : '대변') + '에 올 계정과목은 무엇일까요?',
        opts: opts, answer: target.account, tag: st.tag || '분개', hint: st.prompt
      };
    }
    if (kindRoll < 0.62) {
      return {
        st: st, type: 'type-account',
        q: (pickEntry.side === 'd' ? '차변' : '대변') + ' 계정과목을 직접 써 보세요.',
        answer: pickEntry.account, tag: st.tag || '서술형 대비', hint: st.prompt
      };
    }
    return {
      st: st, type: 'type-amount',
      q: '‘' + pickEntry.account + '’의 금액은 얼마일까요? (원)',
      answer: String(pickEntry.amount), tag: st.tag || '금액 계산', hint: st.prompt
    };
  }
  function accountOptions(correct, n) {
    const a = ACCT[correct];
    const same = Object.keys(ACCT).filter((k) => k !== correct && a && ACCT[k].kind === a.kind);
    const others = Object.keys(ACCT).filter((k) => k !== correct);
    const out = [];
    shuffle(same).forEach((k) => { if (out.length < n) out.push(k); });
    shuffle(others).forEach((k) => { if (out.length < n && out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  function openChallenge() {
    CH = makeChallenge();
    CH.startedAt = Date.now();
    CH.timer = 15;
    $('#chGems').textContent = SAVE.gems;
    renderChallenge();
    show('screen-challenge');
    CH.tick = setInterval(() => {
      CH.timer -= 0.1;
      $('#chBar').style.width = Math.max(0, (CH.timer / 15) * 100) + '%';
      if (CH.timer <= 0) { clearInterval(CH.tick); CH.tick = null; answerChallenge(null); }
    }, 100);
    $('#chBar').style.width = '100%';
  }

  function renderChallenge() {
    const card = $('#chCard');
    card.innerHTML = '';
    const tag = document.createElement('div');
    tag.className = 'ch-tag';
    tag.textContent = '#' + CH.tag + ' · ' + cornerName(CH.st.corner) + ' ' + CH.st.stage + '단계';
    card.appendChild(tag);
    const q = document.createElement('p');
    q.className = 'ch-q';
    q.textContent = CH.q;
    card.appendChild(q);
    const hint = document.createElement('p');
    hint.className = 'ch-hint';
    hint.textContent = CH.hint;
    card.appendChild(hint);
    if (CH.type === 'choice') {
      const wrap = document.createElement('div');
      wrap.className = 'ch-opts';
      CH.opts.forEach((o) => {
        const b = document.createElement('button');
        b.className = 'ch-opt';
        b.textContent = o.label;
        b.addEventListener('click', () => answerChallenge(o.label));
        wrap.appendChild(b);
      });
      card.appendChild(wrap);
    } else {
      const row = document.createElement('div');
      row.className = 'ch-input-row';
      const inp = document.createElement('input');
      inp.className = 'ch-input';
      inp.id = 'chInput';
      inp.placeholder = CH.type === 'type-amount' ? '예: 300000' : '계정과목 입력';
      inp.inputMode = CH.type === 'type-amount' ? 'numeric' : 'text';
      inp.autocomplete = 'off';
      const send = document.createElement('button');
      send.className = 'ch-send';
      send.textContent = '확인';
      const go = () => answerChallenge(inp.value);
      send.addEventListener('click', go);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      row.appendChild(inp); row.appendChild(send);
      card.appendChild(row);
    }
    const res = document.createElement('div');
    res.id = 'chResult';
    card.appendChild(res);
  }

  function normalize(s) {
    return String(s == null ? '' : s).replace(/\s+/g, '').replace(/[(),원₩,]/g, '').replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
  }

  function answerChallenge(given) {
    if (CH.answered) return;
    CH.answered = true;
    if (CH.tick) { clearInterval(CH.tick); CH.tick = null; }
    const left = Math.max(0, Math.round(CH.timer));
    const correct = given != null && normalize(given) === normalize(CH.answer);
    const res = $('#chResult');
    if (CH.type === 'choice') {
      Array.prototype.forEach.call(document.querySelectorAll('.ch-opt'), (b) => {
        if (b.textContent === CH.answer) b.classList.add('right');
        else if (b.textContent === given) b.classList.add('wrong');
      });
    }
    if (correct) {
      const score = 100 + left * 20;
      const gems = 1 + (left >= 10 ? 1 : 0) + (left >= 13 ? 1 : 0);
      P && ((P.score += score));
      SAVE.gems += gems;
      SAVE.best = Math.max(SAVE.best, score);
      save(); paintGems();
      $('#chGems').textContent = SAVE.gems;
      res.className = 'ch-result ok';
      res.innerHTML = '🎉 정답! +' + won(score) + '점 · 💎 +' + gems + ' (남은 ' + left + '초 보너스)<br><b>' + CH.answer + '</b>' + (CH.st.explain ? '<br>' + CH.st.explain : '');
      fx.confetti(140); fx.fireworks(2);
      SOUND.play('right'); SOUND.play('applause'); SOUND.play('whistle');
    } else {
      res.className = 'ch-result no';
      res.innerHTML = (given == null ? '⏰ 시간 초과!' : '정답은 <b>' + CH.answer + '</b>예요.') +
        (CH.st.explain ? '<br>' + CH.st.explain : '');
      SOUND.play('wrong');
    }
    const again = document.createElement('div');
    again.className = 'ch-again';
    const b1 = document.createElement('button');
    b1.className = 'big-btn'; b1.textContent = '한 문제 더 💎'; b1.style.flex = '1';
    b1.addEventListener('click', openChallenge);
    const b2 = document.createElement('button');
    b2.className = 'ghost-btn'; b2.textContent = P ? '게임으로' : '홈으로';
    b2.addEventListener('click', () => { if (P && !P.done) show('screen-play'); else show('screen-home'); });
    again.appendChild(b1); again.appendChild(b2);
    res.appendChild(again);
    if (given != null && !correct) {
      const id = CH.st.id;
      if (SAVE.wrong.indexOf(id) < 0) { SAVE.wrong.push(id); save(); }
    }
  }

  /* ───────── 상점 ───────── */
  const SHOP = [
    { k: 'undo', ico: '↩️', nm: '다시하기', ds: '마지막 배치를 되돌려요 (게임 중)', cost: 3 },
    { k: 'clean', ico: '🧹', nm: '보드 정리', ds: '잠금 상자 3개 제거 + 아래 2줄 정리', cost: 8 },
    { k: 'hint', ico: '💡', nm: '힌트', ds: '정답 조각과 놓을 자리를 알려 줘요', cost: 2 },
    { k: 'gems', ico: '💎', nm: '보석 10개', ds: '챌린지를 풀면 더 빨리 모여요', cost: 0 }
  ];
  function renderShop() {
    $('#shopGems').textContent = SAVE.gems;
    const host = $('#shopList');
    host.innerHTML = '';
    SHOP.forEach((it) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = '<span class="ico">' + it.ico + '</span><span class="meta"><span class="nm">' + it.nm + '</span><span class="ds">' + it.ds + '</span></span>';
      const b = document.createElement('button');
      b.className = 'buy';
      b.textContent = it.k === 'gems' ? '무료 안내' : '💎 ' + it.cost;
      b.addEventListener('click', () => {
        if (it.k === 'gems') { toast('보석은 스테이지 클리어와 챌린지 정답으로 모아요'); return; }
        if (!P || P.done) { toast('게임 중에만 쓸 수 있어요'); return; }
        closeScreens();
        show('screen-play');
        useItem(it.k);
      });
      row.appendChild(b);
      host.appendChild(row);
    });
  }

  /* ───────── 랭킹 ───────── */
  function renderRank() {
    $('#rankGems').textContent = SAVE.gems;
    const host = $('#rankBody');
    const rows = SAVE.scores.slice(0, 12);
    let html = '<p class="section-desc">이 기기에 저장된 내 기록이에요. 친구 기록은 각자 기기에 쌓여요.</p>';
    if (!rows.length) html += '<p class="section-desc">아직 기록이 없어요. 1단계부터 시작해 볼까요?</p>';
    rows.forEach((r, i) => {
      const st = r.id.split('-');
      const name = cornerName(st[0]) + ' ' + st[1] + '단계';
      html += '<div class="rank-row' + (i === 0 ? ' me' : '') + '"><span class="no">' + (i + 1) + '</span><span>' + name + '</span><span class="sc">' + won(r.score) + '점</span></div>';
    });
    html += '<p class="section-desc" style="margin-top:12px">최고 점수 <b>' + won(SAVE.best) + '점</b> · 클리어한 단계 ' + Object.keys(SAVE.stars).length + '개</p>';
    host.innerHTML = html;
  }
  function closeScreens() {}

  /* ───────── 도감 ───────── */
  function renderBook(filter) {
    $('#bookGems').textContent = SAVE.gems;
    const q = (filter || '').trim();
    const keys = Object.keys(ACCT).filter((k) => !q || k.indexOf(q) >= 0 || ACCT[k].desc.indexOf(q) >= 0);
    $('#bookList').innerHTML = keys.map((k) => {
      const a = ACCT[k];
      return '<div class="book-item"><b>' + k + '</b><small>' + a.kind + ' · 주로 ' + (a.inc || '-') + '<br>' + a.desc + '</small></div>';
    }).join('') || '<p class="section-desc">검색 결과가 없어요</p>';
  }

  /* ───────── 오버레이 버튼 ───────── */
  document.addEventListener('click', function (e) {
    const ov = e.target.closest('[data-ov]');
    if (!ov) return;
    const k = ov.dataset.ov;
    const which = ov.closest('.overlay').id;
    if (which === 'ovClear') {
      $('#ovClear').hidden = true;
      if (k === 'next') {
        const st = P.st;
        const list = D.STAGES[P.cornerKey];
        if (st.stage < list.length) startStage(P.cornerKey, st.stage + 1);
        else { openStages(P.cornerKey); toast('코너 완주! 다른 코너에 도전해요'); }
      } else if (k === 'retry') startStage(P.cornerKey, P.stageNo);
      else if (k === 'chal') openChallenge();
    } else if (which === 'ovOver') {
      $('#ovOver').hidden = true;
      if (k === 'retry') startStage(P.cornerKey, P.stageNo);
      else if (k === 'quit') openStages(P.cornerKey);
      else if (k === 'continue') {
        if (SAVE.gems < 5) { toast('보석이 모자라요 (필요 💎5)'); return; }
        addGems(-5);
        [6, 7].forEach((r) => { for (let c = 0; c < N; c++) { const i = idx(r, c); if (P.grid[i] && !P.grid[i].sealed) P.grid[i] = null; } });
        let rm = 0; P.obst.forEach((i) => { if (rm < 4) { P.obst.delete(i); rm++; } });
        P.over = false;
        renderBoard(); refillTray(); renderMission();
        toast('💎5 사용 · 보드를 정리했어요');
      }
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-back]')) { show('screen-home'); renderHome(); }
  });

  /* ───────── 바인딩 ───────── */
  $('#btnPlay').addEventListener('click', () => {
    const last = SAVE.last || { corner: 'inv', stage: 1 };
    const next = D.STAGES[last.corner][Math.min(last.stage, D.STAGES[last.corner].length) - 1];
    startStage(last.corner, next.stage);
  });
  $('#btnChallenge').addEventListener('click', openChallenge);
  $('#itemChallenge').addEventListener('click', () => {
    if (!P || P.done) return;
    openChallenge();
  });
  $('#btnShop').addEventListener('click', () => { renderShop(); show('screen-shop'); });
  $('#btnRank').addEventListener('click', () => { renderRank(); show('screen-rank'); });
  $('#btnBook').addEventListener('click', () => { renderBook(''); show('screen-book'); });
  $('#bookSearch').addEventListener('input', (e) => renderBook(e.target.value));
  $('#playExit').addEventListener('click', () => { if (P) P.done = true; show('screen-stages'); openStages(SAVE.last.corner); });
  $('#itemUndo').addEventListener('click', () => useItem('undo'));
  $('#itemClean').addEventListener('click', () => useItem('clean'));
  $('#itemHint').addEventListener('click', () => useItem('hint'));

  /* ───────── 시작 ───────── */
  renderHome();
  paintGems();
  SOUND.set(SAVE.music !== false);

  /* 테스트용 읽기 전용 훅 */
  window.__blast = {
    state: function () {
      return P ? {
        corner: P.cornerKey, stage: P.stageNo, score: P.score, combo: P.combo,
        mission: P.mission.map((m) => ({ side: m.side, account: m.account, filled: m.filled })),
        tray: P.tray.map((p) => p && { key: p.key, cells: p.cells, shape: p.shape }),
        obstacles: Array.from(P.obst), gridFilled: P.grid.filter(Boolean).length,
        done: P.done, over: P.over, gems: SAVE.gems
      } : { gems: SAVE.gems, stars: Object.keys(SAVE.stars).length };
    },
    start: startStage,
    challenge: makeChallenge
  };
})();
