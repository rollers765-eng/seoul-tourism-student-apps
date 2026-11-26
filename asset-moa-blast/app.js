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
  const DEF = { gems: 30, stars: {}, best: 0, wrong: [], last: { corner: 'inv', stage: 1 }, scores: [], music: true, queue: [], recent: [], lastQid: null };
  let SAVE = load();
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign({}, DEF, raw, {
        stars: Object.assign({}, raw.stars || {}),
        wrong: Array.isArray(raw.wrong) ? raw.wrong : [],
        scores: Array.isArray(raw.scores) ? raw.scores : [],
        queue: Array.isArray(raw.queue) ? raw.queue : [],
        recent: Array.isArray(raw.recent) ? raw.recent : []
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
  const appEl = $('#app');
  const dragDiagnostics = new URLSearchParams(location.search).get('dragDiag') === '1';

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
    b.className = 'bubble-float';
    b.textContent = msg;
    host.appendChild(b);
    setTimeout(() => b.remove(), 2200);
  }
  function playScore() { return Math.max(0, P.earned - P.penalty); }
  function won(n) { return Number(n).toLocaleString('ko-KR'); }
  function paintGems() {
    ['#homeGems', '#stagesGems', '#playGems', '#chGems', '#shopGems', '#rankGems', '#bookGems'].forEach((s) => {
      const el = $(s); if (!el) return;
      const target = el.tagName === 'B' ? el : el.querySelector('b');
      if (target) target.textContent = SAVE.gems;
    });
  }

  /* ───────── 계정 색/분류 ───────── */
  const KIND_STYLES = {
    '자산': ['c-asset', 'c-asset2', 'c-asset3'],
    '투자자산': ['c-asset2', 'c-asset3', 'c-asset'],
    '유형자산': ['c-asset', 'c-asset3', 'c-asset2'],
    '무형자산': ['c-asset3', 'c-asset2', 'c-asset'],
    '부채': ['c-liab', 'c-liab2'],
    '비용': ['c-cost', 'c-cost2'],
    '수익': ['c-rev', 'c-rev2']
  };
  function hashOf(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function catClass(name) {
    const a = ACCT[name];
    if (!a) return 'c-pick';
    if (String(a.kind).indexOf('차감') >= 0) return 'c-assetchi';
    const list = KIND_STYLES[a.kind] || ['c-asset'];
    return list[hashOf(name) % list.length];
  }
  /* ───────── 조각 모양 카탈로그 ───────── */
  function shape(name, weight, ...rows) {
    return { n: name, weight, c: rows.flatMap((row, r) =>
      [...row].flatMap((cell, c) => cell === '#' ? [[r, c]] : [])) };
  }
  const SHAPES = [
    shape('2가로', 3, '##'), shape('2세로', 3, '#', '#'),
    shape('3가로', 4, '###'), shape('3세로', 4, '#', '#', '#'),
    shape('4가로', 3, '####'), shape('4세로', 3, '#', '#', '#', '#'),
    shape('2x2', 4, '##', '##'), shape('3x3', 0.6, '###', '###', '###'),
    shape('ㄱ 소', 3, '##', '.#'), shape('역ㄱ 소', 3, '##', '#.'),
    shape('ㄴ 소', 3, '#.', '##'), shape('역ㄴ 소', 3, '.#', '##'),
    shape('ㄱ 대', 2, '###', '..#', '..#'), shape('역ㄱ 대', 2, '###', '#..', '#..'),
    shape('ㄴ 대', 2, '#..', '#..', '###'), shape('역ㄴ 대', 2, '..#', '..#', '###'),
    shape('+', 2, '.#.', '###', '.#.')
  ];
  const ACCOUNT_SHAPES = SHAPES.filter((s) => s.c.length <= 4);
  const ACCOUNT_RATE = 0.42;

  function shapeWeighted(pool) {
    let roll = Math.random() * pool.reduce((sum, sp) => sum + sp.weight, 0);
    return pool.find((sp) => (roll -= sp.weight) < 0) || pool[0];
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

  function rid() { return Math.random().toString(36).slice(2); }

  const PURE_CATS = ['c-pure1', 'c-pure2', 'c-pure3', 'c-pure4', 'c-pure5'];

  function makePiece(shape, account = null, side = null, cat = pickOne(PURE_CATS)) {
    return { key: account, pure: account === null, cat, cells: shape.c, shape: shape.n, side, id: rid() };
  }

  function playableShapes(pool, side) {
    return pool.filter((sp) => placements({ cells: sp.c }, P.grid, P.obst, side).length);
  }

  function preferredShape(pool, side) {
    const occupied = P.grid.reduce((count, cell) => count + (cell ? 1 : 0), 0);
    if (occupied >= 4 && occupied + P.obst.size <= 42 && Math.random() < 0.4) {
      const gaps = [];
      for (let line = 0; line < N; line++) {
        for (const axis of ['row', 'col']) {
          const cells = Array.from({ length: N }, (_, i) => axis === 'row' ? idx(line, i) : idx(i, line));
          if (cells.some((i) => P.obst.has(i))) continue;
          const missing = cells.filter((i) => !P.grid[i]);
          if (missing.length > 0 && missing.length <= 9) gaps.push(missing);
        }
      }
      const matching = pool.filter((sp) => placements({ cells: sp.c }, P.grid, P.obst, side).some(([r, c]) => {
        const filled = new Set(sp.c.map(([dr, dc]) => idx(r + dr, c + dc)));
        return gaps.some((missing) => missing.every((i) => filled.has(i)));
      }));
      if (matching.length) return shapeWeighted(matching);
    }
    return shapeWeighted(pool);
  }

  function nextPiece() {
    const held = P.tray.filter(Boolean);
    const accounts = new Set(held.filter((pc) => !pc.pure).map((pc) => pc.key));
    const open = P.mission.filter((m) => !m.filled && !accounts.has(m.account));
    if (open.length && (!accounts.size || Math.random() < ACCOUNT_RATE)) {
      for (const entry of shuffle(open)) {
        const shapes = playableShapes(ACCOUNT_SHAPES, entry.side);
        if (shapes.length) {
          return makePiece(preferredShape(shapes, entry.side), entry.account, entry.side, catClass(entry.account));
        }
      }
      // 막힌 계정은 미션에 남겨 두고, 빈자리가 생긴 다음 리필에서 다시 검사한다.
    }
    const available = playableShapes(SHAPES, 'any');
    const colors = PURE_CATS.filter((cat) => !held.some((pc) => pc.cat === cat));
    return makePiece(available.length ? preferredShape(available, 'any') : shapeWeighted(SHAPES), null, null, pickOne(colors.length ? colors : PURE_CATS));
  }

  function refillTray() {
    P.tray = new Array(3).fill(null);
    for (let i = 0; i < P.tray.length; i++) P.tray[i] = nextPiece();
    renderTray();
  }

  function anyTrayFits() {
    return P.tray.some((p) => p && placements(p, P.grid, P.obst, p.side || 'any').length > 0);
  }

  /* ───────── 렌더 ───────── */
  function renderBoard(animSet) {
    boardEl.innerHTML = '';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = idx(r, c), v = P.grid[i];
      const d = document.createElement('div');
      d.className = 'cell ' + (c < 4 ? 'debit' : 'credit');
      d.dataset.i = String(i);
      d.setAttribute('role', 'gridcell');
      d.setAttribute('aria-label', (c < 4 ? '차변 ' : '대변 ') + (r + 1) + '행 ' + (c % 4 + 1) + '열' + (v && v.key ? ' · ' + v.key : (v && v.pure ? ' · 색 블록' : (P.obst.has(i) ? ' · 잠금 상자' : ' · 빈 칸'))));
      if (P.obst.has(i)) d.classList.add('obstacle');
      else if (v) {
        const b = document.createElement('div');
        b.className = 'blk ' + v.cat + (v.sealed ? ' sealed' : '') + (v.pure ? ' pure' : '');
        if (v.key && !v.pure) b.classList.add('account-edge');
        if (v.key) {
          const s = document.createElement('span');
          s.className = 'account-cell-label';
          s.dataset.label = v.key;
          s.textContent = v.key;
          b.appendChild(s);
        }
        d.appendChild(b);
        if (animSet && animSet.has(i)) { d.classList.add('drop-anim'); }
      }
      boardEl.appendChild(d);
    }
    fitBoardLabels();
  }

  function trayCell() { return window.innerWidth <= 350 ? 22 : window.innerWidth <= 400 ? 26 : 29; }

  const labelMeasure = document.createElement('canvas').getContext('2d');
  function fitLabel(node, width, height, maxSize, maxLines, lineHeight) {
    const label = node.dataset.label;
    if (width <= 0 || height <= 0 || !labelMeasure) return;
    const font = getComputedStyle(node).fontFamily;
    const chars = [...label];
    for (let size = maxSize; size >= 5; size--) {
      labelMeasure.font = '900 ' + size + 'px ' + font;
      if (size * lineHeight <= height && labelMeasure.measureText(label).width <= width) {
        node.style.fontSize = size + 'px';
        node.textContent = label;
        return;
      }
      if (maxLines === 1 || 2 * size * lineHeight > height) continue;
      const middle = Math.ceil(chars.length / 2);
      const lines = [chars.slice(0, middle).join('').trim(), chars.slice(middle).join('').trim()];
      if (lines.every((line) => labelMeasure.measureText(line).width <= width)) {
        node.style.fontSize = size + 'px';
        node.textContent = lines.join('\n');
        return;
      }
    }
    node.style.fontSize = '5px';
    node.textContent = label;
  }

  function fitBoardLabels() {
    const sample = boardEl.firstElementChild;
    if (!sample) return;
    boardEl.querySelectorAll('.account-cell-label').forEach((node) =>
      fitLabel(node, sample.clientWidth - 4, sample.clientHeight - 3, 15, 2, 1.05));
  }

  function fitTrayPieces() {
    trayEl.querySelectorAll('.slot-piece').forEach((wrap) => {
      const piece = wrap.querySelector('.piece');
      if (!piece) return;
      const name = wrap.querySelector('.piece-name.acct');
      const { rows, cols } = piece.dataset;
      if (name) fitLabel(name, wrap.clientWidth - 19, 28, innerWidth < 400 ? 16 : 19, 2, 1.05);
      const reserve = name ? Math.max(16, name.offsetHeight + 3) : 0;
      wrap.classList.toggle('account-slot', !!name);
      if (name) wrap.style.setProperty('--account-reserve', reserve + 'px');
      const size = Math.floor(Math.min(trayCell(), (wrap.clientWidth - 6 - (cols - 1) * 3) / cols,
        (wrap.clientHeight - reserve - 8 - (rows - 1) * 3) / rows));
      if (size > 0) {
        piece.style.gridTemplateColumns = 'repeat(' + cols + ', ' + size + 'px)';
        piece.style.gridTemplateRows = 'repeat(' + rows + ', ' + size + 'px)';
      }
    });
  }

  function renderTray(replacedSlot) {
    const replacing = Number.isInteger(replacedSlot) && trayEl.children.length === 3;
    if (!replacing) trayEl.replaceChildren();
    P.tray.forEach((pc, si) => {
      if (replacing && si !== replacedSlot) return;
      const wrap = document.createElement('div');
      wrap.className = 'slot-piece';
      if (pc) {
        const piece = document.createElement('div');
        piece.className = 'piece' + (pc.pure ? ' pure' : ' acct');
        piece.style.gap = '3px';
        piece.setAttribute('role', 'button');
        piece.setAttribute('aria-label', pc.pure ? '색 블록 조각 · 어디든 놓아 줄을 터뜨려요' :
          pc.key + ' 조각 · 끌어 놓거나 눌러서 고르기');
        piece.tabIndex = 0;
        piece.dataset.slot = String(si);
        piece.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectPiece(si); }
        });
        const rows = Math.max(...pc.cells.map(([r]) => r)) + 1;
        const cols = Math.max(...pc.cells.map(([, c]) => c)) + 1;
        piece.dataset.rows = rows;
        piece.dataset.cols = cols;
        const cells = new Set(pc.cells.map(([r, c]) => r + ':' + c));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const cell = document.createElement('div');
          if (cells.has(r + ':' + c)) cell.className = 'pcell ' + pc.cat + (pc.pure ? '' : ' account-edge');
          else cell.style.visibility = 'hidden';
          piece.appendChild(cell);
        }
        wrap.appendChild(piece);
        if (!pc.pure) {
          const name = document.createElement('span');
          name.className = 'piece-name acct';
          name.dataset.label = pc.key;
          name.textContent = pc.key;
          wrap.appendChild(name);
        }
        if (replacedSlot === si) wrap.classList.add('tray-refill');
      }
      if (replacing) trayEl.children[si].replaceWith(wrap);
      else trayEl.appendChild(wrap);
    });
    fitTrayPieces();
    paintSelection();
  }

  function fitBoardToScreen() {
    const screen = $('#screen-play');
    if (!screen.classList.contains('active')) return;
    const edges = getComputedStyle(screen);
    const stack = ['.play-top', '#mission', '#tray', '.items'].map((selector) => screen.querySelector(selector));
    const budget = () => Math.floor(screen.clientHeight - stack.reduce((sum, node) => {
      const style = getComputedStyle(node);
      return sum + node.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    }, parseFloat(edges.paddingTop) + parseFloat(edges.paddingBottom)) - 1);
    const mission = stack[1];
    const variants = ['mission-dense', 'mission-tight', 'mission-compact'];
    const target = Number(edges.getPropertyValue('--board-target')) || 0;
    mission.classList.remove(...variants);
    let width = budget();
    for (const variant of variants) {
      if (width >= target) break;
      mission.classList.add(variant);
      width = budget();
    }
    screen.style.setProperty('--board-fit', Math.max(96, width) + 'px');
  }

  function fitPlayLabels() {
    if (!P || !$('#screen-play').classList.contains('active')) return;
    fitBoardToScreen();
    fitTrayPieces();
    fitBoardLabels();
  }
  window.addEventListener('resize', fitPlayLabels);
  document.fonts?.ready.then(fitPlayLabels);

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
    $('#playScore').textContent = won(playScore());
    $('#playStageLabel').textContent = cornerName(P.cornerKey) + ' ' + P.stageNo + '단계 · ' + done + '/' + P.mission.length;
    fitBoardToScreen();
    fitBoardLabels();
  }

  function cornerName(key) {
    const c = D.CORNERS.filter((x) => x.key === key)[0];
    return c ? c.name : '';
  }

  /* ───────── 드래그 ───────── */
  let drag = null;
  let sel = null; // {slot} 탭으로 고른 조각

  function metrics() {
    const cells = boardEl.querySelectorAll('.cell');
    if (!cells.length) return null;
    const r0 = cells[0].getBoundingClientRect();
    const r1 = cells[1].getBoundingClientRect();
    const nextRow = cells[N].getBoundingClientRect();
    const layerRect = dragLayer.getBoundingClientRect();
    const layerStyle = getComputedStyle(dragLayer);
    const scaleX = layerRect.width / parseFloat(layerStyle.width) || 1;
    const scaleY = layerRect.height / parseFloat(layerStyle.height) || 1;
    return { width: r0.width, height: r0.height, strideX: r1.left - r0.left,
      strideY: nextRow.top - r0.top, top: r0.top, left: r0.left, layerRect, scaleX, scaleY };
  }
  trayEl.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary || e.button !== 0) return;
    // 같은 입력 종류의 새 primary down은 이전 제스처가 끝났다는 뜻이다.
    if (drag && drag.pointerType !== e.pointerType &&
        drag.source.isConnected && trayEl.hasPointerCapture(drag.pointerId)) return;
    const interrupted = drag ? clearDrag() : null;
    const wrap = e.target.closest('.slot-piece');
    const pEl = e.target.closest('.piece') ||
      (interrupted?.source.parentElement === wrap && interrupted.source);
    if (!pEl || !P || P.over || P.done || P.settling) return;
    const si = Number(pEl.dataset.slot);
    const pc = P.tray[si];
    if (!pc) return;
    e.preventDefault();
    const rect = pEl.getBoundingClientRect();
    const cols = Math.max.apply(null, pc.cells.map((a) => a[1])) + 1;
    const rows = Math.max.apply(null, pc.cells.map((a) => a[0])) + 1;
    // 누른 지점에서 가장 가까운 '채워진 칸'을 집는 칸으로 삼는다 (대각선·구멍 있는 조각 대응)
    const lx = (e.clientX - rect.left) / (rect.width / cols) - 0.5;
    const ly = (e.clientY - rect.top) / (rect.height / rows) - 0.5;
    let best = pc.cells[0], bestD = Infinity;
    pc.cells.forEach(([r, c]) => {
      const d = (r - ly) * (r - ly) + (c - lx) * (c - lx);
      if (d < bestD) { bestD = d; best = [r, c]; }
    });
    const offR = best[0];
    const offC = best[1];
    drag = { piece: pc, slot: si, source: pEl, pointerId: e.pointerId, pointerType: e.pointerType,
      offR, offC, ghost: null, startX: e.clientX, startY: e.clientY, moved: false };
    buildGhost(pc);
    pEl.classList.add('gone');
    moveDrag(e.clientX, e.clientY);
    // 리필로 교체되는 조각 대신 유지되는 트레이에서 포인터를 캡처한다.
    try { trayEl.setPointerCapture(e.pointerId); } catch (err) {}
  });

  function buildGhost(pc) {
    const g = document.createElement('div');
    g.className = 'piece drag-ghost';
    const rows = Math.max.apply(null, pc.cells.map((a) => a[0])) + 1;
    const cols = Math.max.apply(null, pc.cells.map((a) => a[1])) + 1;
    g.dataset.cols = cols;
    g.dataset.rows = rows;
    const map = {};
    pc.cells.forEach(([r, c]) => { map[r + ':' + c] = 1; });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = document.createElement('div');
      if (map[r + ':' + c]) {
        d.className = 'blk ' + pc.cat;
        d.style.position = 'relative';
        d.style.borderRadius = '7px';
        if (pc.key) {
          const sp = document.createElement('span');
          sp.textContent = pc.key;
          d.appendChild(sp);
        }
      } else d.style.visibility = 'hidden';
      g.appendChild(d);
    }
    dragLayer.appendChild(g);
    drag.ghost = g;
    appEl.classList.add('drag-active');
  }

  function moveDrag(x, y) {
    if (!drag) return;
    const m = metrics(); if (!m) return;
    const lift = drag.pointerType === 'touch' ? Math.max(44, Math.min(72, m.strideY * 1.1)) : 0;
    const row = (y - lift - m.top - m.height / 2) / m.strideY - drag.offR;
    const col = (x - m.left - m.width / 2) / m.strideX - drag.offC;
    const nearest = { r: Math.round(row), c: Math.round(col) };
    const direct = canPlace(drag.piece, nearest.r, nearest.c, P.grid, P.obst);
    const preferredSide = direct ? 'any' : (drag.piece.side || 'any');
    let best = null;
    let distance = 1.2 ** 2 + 1e-8;
    for (let r = Math.floor(row - 1.2); r <= Math.ceil(row + 1.2); r++) {
      for (let c = Math.floor(col - 1.2); c <= Math.ceil(col + 1.2); c++) {
        const delta = (r - row) ** 2 + (c - col) ** 2;
        if (delta >= distance || !canPlace(drag.piece, r, c, P.grid, P.obst) ||
          !inSide(drag.piece, r, c, preferredSide)) continue;
        best = { r, c };
        distance = delta;
      }
    }
    drag.target = best;
    const anchor = best || { r: row, c: col };
    const ghost = drag.ghost;
    // 뷰포트 rect 차이를 보드 레이어의 로컬 CSS 좌표로 바꿔 같은 레이아웃에서 그린다.
    ghost.style.left = (m.left - m.layerRect.left + anchor.c * m.strideX) / m.scaleX + 'px';
    ghost.style.top = (m.top - m.layerRect.top + anchor.r * m.strideY) / m.scaleY + 'px';
    ghost.style.gridTemplateColumns = 'repeat(' + ghost.dataset.cols + ', ' + m.width / m.scaleX + 'px)';
    ghost.style.gridTemplateRows = 'repeat(' + ghost.dataset.rows + ', ' + m.height / m.scaleY + 'px)';
    ghost.style.columnGap = (m.strideX - m.width) / m.scaleX + 'px';
    ghost.style.rowGap = (m.strideY - m.height) / m.scaleY + 'px';
    clearPreview();
    const preview = best || nearest;
    const ok = best && inSide(drag.piece, preview.r, preview.c, drag.piece.side || 'any');
    cellsFor(drag.piece, preview.r, preview.c).forEach(([r, c]) => {
      if (r < 0 || r >= N || c < 0 || c >= N) return;
      const el = boardEl.children[idx(r, c)];
      if (el) el.classList.add(ok ? 'preview-ok' : 'preview-bad');
    });
    if (dragDiagnostics || window.__blastDragDiagEnabled === true) recordDragGeometry(ghost, best);
  }

  function recordDragGeometry(ghost, target) {
    const keys = ['left', 'top', 'width', 'height'];
    const bounds = ghost.getBoundingClientRect();
    const rect = Object.fromEntries(keys.map((key) => [key, bounds[key]]));
    const cells = [...boardEl.querySelectorAll('.preview-ok,.preview-bad')].map((cell) => cell.getBoundingClientRect());
    let preview = null;
    if (cells.length) {
      const left = Math.min(...cells.map((cell) => cell.left));
      const top = Math.min(...cells.map((cell) => cell.top));
      preview = { left, top, width: Math.max(...cells.map((cell) => cell.right)) - left,
        height: Math.max(...cells.map((cell) => cell.bottom)) - top };
    }
    const delta = preview ? Object.fromEntries(keys.map((key) => [key, rect[key] - preview[key]])) : null;
    window.__blastDragDiag = { ghost: rect, preview, delta, target: target ? { ...target } : null, cells: cells.length };
  }
  function clearPreview() {
    boardEl.querySelectorAll('.preview-ok,.preview-bad').forEach((el) => el.classList.remove('preview-ok', 'preview-bad'));
  }

  function clearDrag() {
    const current = drag;
    if (!current) return null;
    drag = null;
    current.ghost?.remove();
    appEl.classList.remove('drag-active');
    current.source.classList.remove('gone');
    clearPreview();
    if (trayEl.hasPointerCapture(current.pointerId)) trayEl.releasePointerCapture(current.pointerId);
    return current;
  }

  function movedPointer(event, current) {
    return Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY) > 8;
  }

  function ownsPointer(event) {
    return drag && event.pointerId === drag.pointerId && event.pointerType === drag.pointerType;
  }

  window.addEventListener('pointermove', (event) => {
    if (!ownsPointer(event)) return;
    drag.moved ||= movedPointer(event, drag);
    if (!drag.moved) return;
    event.preventDefault();
    moveDrag(event.clientX, event.clientY);
  }, { capture: true, passive: false });

  window.addEventListener('pointerup', (event) => {
    if (!ownsPointer(event)) return;
    const outside = event.clientX < 0 || event.clientY < 0 ||
      event.clientX >= window.innerWidth || event.clientY >= window.innerHeight;
    if (outside || !drag.source.isConnected || P?.tray[drag.slot] !== drag.piece) {
      clearDrag();
      return;
    }
    drag.moved ||= movedPointer(event, drag);
    if (drag.moved) moveDrag(event.clientX, event.clientY);
    const finished = clearDrag();
    if (finished.moved) {
      if (finished.target) tryPlace(finished.piece, finished.slot, finished.target.r, finished.target.c);
    } else selectPiece(finished.slot);
  }, true);

  function cancelDrag(event) {
    if (ownsPointer(event)) clearDrag();
  }
  window.addEventListener('pointercancel', cancelDrag, true);
  window.addEventListener('lostpointercapture', (event) => {
    if (event.target === trayEl) cancelDrag(event);
  }, true);
  window.addEventListener('blur', (event) => {
    if (event.target === window) clearDrag();
  }, true);

  function selectPiece(slot) {
    if (!P || P.over || P.done || P.settling) return;
    if (sel && sel.slot === slot) { sel = null; }
    else { sel = { slot: slot }; SOUND.play('place'); }
    paintSelection();
    const pc = P.tray[slot];
    if (sel && pc) {
      const spots = placements(pc, P.grid, P.obst, 'any');
      if (!spots.length) toast('이 조각은 지금 놓을 자리가 없어요');
    }
  }
  function paintSelection() {
    trayEl.querySelectorAll('.piece').forEach((el) => {
      el.classList.toggle('sel', !!sel && Number(el.dataset.slot) === sel.slot);
    });
    boardEl.classList.toggle('pick-mode', !!sel);
  }
  /* 보드 탭 배치 (드래그 보조) */
  boardEl.addEventListener('click', function (e) {
    if (!sel || !P || P.over || P.done || P.settling) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const i = Number(cell.dataset.i);
    const pc = P.tray[sel.slot];
    if (!pc) { sel = null; paintSelection(); return; }
    const tr = Math.floor(i / 8), tc = i % 8;
    // 누른 칸이 조각의 첫 칸이 되도록, 안 되면 조각 안에서 가장 가까운 칸 기준으로 보정
    const tries = [[tr, tc]];
    pc.cells.forEach(([dr, dc]) => tries.push([tr - dr, tc - dc]));
    for (const [r0, c0] of tries) {
      if (canPlace(pc, r0, c0, P.grid, P.obst)) {
        const slot = sel.slot;
        sel = null; paintSelection();
        tryPlace(pc, slot, r0, c0);
        return;
      }
    }
    toast('여기에는 이 조각이 들어가지 않아요');
    SOUND.play('wrong');
  });

  let tipTimer;
  function particle(word, closed, open) {
    const letter = word.trim().slice(-1).charCodeAt(0);
    return letter >= 0xac00 && letter <= 0xd7a3 && (letter - 0xac00) % 28 ? closed : open;
  }

  function showPlacementTip(entry) {
    const name = entry.account;
    const info = ACCT[name];
    const where = entry.side === 'd' ? '차변' : '대변';
    let hint;
    if (info?.inc === where) {
      hint = name + particle(name, '은', '는') + ' ' + info.kind + ' 계정이라 늘어나면 ' + where + '에 적어요.';
    } else if (info?.inc) {
      hint = '이 거래에서는 ' + name + particle(name, '이', '가') + ' 줄어서 ' + where +
        '에 적어요. (늘어날 때는 ' + info.inc + ')';
    } else {
      hint = name + particle(name, '은', '는') + ' 이 거래에서 ' + where + '에 적어요.';
    }
    const tip = $('#placementTip');
    tip.textContent = '−30점 · ' + hint + (playScore() === 0 ? ' 점수는 0점 아래로 내려가지 않아요.' : '');
    tip.hidden = false;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => { tip.hidden = true; }, 3200);
    boardEl.classList.remove('placement-shake');
    void boardEl.offsetWidth;
    boardEl.classList.add('placement-shake');
  }

  /* ───────── 배치 ───────── */
  function tryPlace(piece, slot, r0, c0) {
    if (!P || P.done || P.over || P.settling || P.tray[slot] !== piece ||
      !canPlace(piece, r0, c0, P.grid, P.obst)) return;
    const miss = piece.pure ? null : P.mission.find((m) => !m.filled && m.account === piece.key && m.side === piece.side);
    if (!piece.pure && !miss) return;
    const sideForPiece = miss ? miss.side : null;
    if (miss && sideForPiece !== 'any' && !inSide(piece, r0, c0, sideForPiece)) {
      P.penalty += 30;
      renderMission();
      showPlacementTip(miss);
      SOUND.play('wrong');
      return;
    }
    P.settling = true;
    clearTimeout(P.clearPaint);
    sel = null;
    // 히스토리 저장
    P.history.push({
      grid: P.grid.slice(),
      obst: new Set(P.obst),
      mission: P.mission.map((m) => Object.assign({}, m)),
      tray: P.tray.slice(),
      earned: P.earned, penalty: P.penalty, combo: P.combo, comboMoves: P.comboMoves, clears: P.clears, placed: P.placed
    });
    if (P.history.length > 40) P.history.shift();

    const anim = new Set();
    cellsFor(piece, r0, c0).forEach(([r, c]) => {
      const i = idx(r, c);
      P.grid[i] = { key: piece.key, cat: piece.cat, pure: !!piece.pure, sealed: false };
      anim.add(i);
    });
    P.tray[slot] = null;
    const usedSlot = trayEl.querySelector('.piece[data-slot="' + slot + '"]');
    if (usedSlot && usedSlot.parentNode) usedSlot.parentNode.innerHTML = '';
    SOUND.play('place');
    navigator.vibrate?.(15);

    // 미션 채움
    if (miss) {
      miss.filled = true;
      cellsFor(piece, r0, c0).forEach(([r, c]) => { P.grid[idx(r, c)].sealed = true; });
      P.earned += 150;
      SOUND.play('right');
      setTimeout(() => bubble('✅ ' + piece.key + ' 자리 완성!'), 60);
      const slotEl = journalEl.querySelector('.jslot[data-acc="' + piece.key + '"]');
      if (slotEl) { slotEl.classList.add('pop'); }
      flashText('+' + 150);
    } else if (piece.pure) {
      // 색 블록은 놓는 것만으로도 점수 (블록 블라스트 손맛)
      const gain = 5 * piece.cells.length;
      P.earned += gain;
      P.placed = (P.placed || 0) + 1;
    }

    renderBoard(anim);
    renderMission();

    // 판 상태를 먼저 정산해 같은 입력 이벤트에서 실제로 놓을 수 있는 조각을 공급한다.
    const cleared = resolveLines();
    updateStreak(cleared);
    P.tray[slot] = nextPiece();
    renderTray(slot);
    P.settling = false;
    finishTurn();
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
    const centers = [];
    cellSet.forEach((i) => {
      const el = boardEl.children[i];
      if (!el) return;
      el.classList.add('line-flash');
      const rect = el.getBoundingClientRect();
      centers.push([rect.x + rect.width / 2, rect.y + rect.height / 2]);
      const block = el.querySelector('.blk');
      if (block && !P.grid[i]?.sealed) block.classList.add('clear-anim');
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
    return { lines: full, count: full.length, obstCleared: obstCleared, cells: doomed, centers };
  }

  function updateStreak(res) {
    if (res.count) {
      afterClear(res);
    } else if (P.comboMoves > 0 && --P.comboMoves === 0) {
      P.combo = 0;
    }
  }

  function afterClear(res) {
    const clearPoints = [0, 300, 800, 1500, 2400];
    const pts = (clearPoints[res.count] ?? 100 * res.count * (res.count + 2)) + res.obstCleared * 50;
    P.clears += res.count;
    P.earned += pts;
    const goalEl = $('#missionGoal');
    if (goalEl) { goalEl.classList.add('on'); goalEl.textContent = '🎯 ' + P.clears + '줄 터뜨림!'; }
    P.combo = Math.min(9, P.combo + 1);
    P.comboMoves = 3;
    const comboGain = Math.round(pts * (P.combo - 1) * .4);
    navigator.vibrate?.([0, 25, 40, 30]);
    boardEl.classList.remove('line-punch');
    void boardEl.offsetWidth;
    boardEl.classList.add('line-punch');
    fx.shards(res.centers, P.combo);
    if (P.combo >= 2) {
      P.earned += comboGain;
      const banner = $('#comboBanner');
      banner.textContent = '🔥 COMBO ×' + P.combo + ' · +' + won(comboGain);
      banner.classList.add('show');
      clearTimeout(banner._t);
      banner._t = setTimeout(() => banner.classList.remove('show'), 1100);
      SOUND.play('combo', P.combo);
    } else {
      SOUND.play('clear', res.count);
    }
    flashText('+' + (pts + comboGain));
    $('#playScore').textContent = won(playScore());
    if (res.count >= 2 || P.combo >= 3) fx.confetti(Math.min(180, 65 + res.count * 18 + P.combo * 12));
    if (res.count >= 2) fx.firework();
    if (res.count >= 3) fx.fireworks(2);
    const stage = P;
    clearTimeout(stage.clearPaint);
    stage.clearPaint = setTimeout(() => { if (P === stage) renderBoard(); }, 175);
  }

  function flashText(text) {
    const d = document.createElement('div');
    d.className = 'flash-score';
    d.textContent = text;
    $('#screen-play').appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  function finishTurn() {
    const stage = P;
    if (stage.done || stage.settling) return;
    if (stage.mission.every((m) => m.filled)) {
      stage.settling = true;
      setTimeout(() => {
        if (P !== stage) return;
        stage.settling = false;
        stageClear();
      }, 260);
      return;
    }
    if (!anyTrayFits()) {
      setTimeout(() => {
        if (P !== stage || stage.done || !$('#screen-play').classList.contains('active') || anyTrayFits()) return;
        stage.over = true;
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
      mission: buildMission(st), tray: [], earned: 0, penalty: 0, combo: 0, comboMoves: 0, clears: 0, placed: 0, settling: false,
      history: [], over: false, done: false, startedAt: Date.now()
    };
    SAVE.last = { corner: cornerKey, stage: stageNo }; save();
    clearTimeout(tipTimer);
    $('#placementTip').hidden = true;
    boardEl.classList.remove('placement-shake');
    sel = null;
    clearDrag();
    show('screen-play');
    renderBoard();
    refillTray();
    renderMission();
    $('#playScore').textContent = '0';
    const g = $('#missionGoal');
    if (g) { g.classList.remove('on'); g.textContent = '🎯 한 줄 터뜨리면 +300'; }
    SOUND.start();
    if (stageNo <= 2) bubble('색 블록은 어디든! 계정 블록은 차변·대변 제자리에');
  }

  function stageClear() {
    if (P.done) return;
    P.done = true;
    const sec = Math.max(1, Math.round((Date.now() - P.startedAt) / 1000));
    const speed = Math.max(0, 500 - Math.max(0, sec - 25) * 8);
    const filled = P.grid.filter(Boolean).length;
    const room = Math.max(0, 40 - Math.max(0, filled - 8) * 2);
    const comboBonus = P.combo * 30;
    const lineBonus = P.clears > 0 ? 300 : 0;
    const total = Math.max(0, 500 + P.earned - P.penalty + speed + room + comboBonus + lineBonus);
    const stars = total >= 1100 ? 3 : total >= 750 ? 2 : 1;
    const gems = 5 + (stars - 1) * 2;
    const id = P.st.id;
    SAVE.stars[id] = Math.max(SAVE.stars[id] || 0, stars);
    SAVE.best = Math.max(SAVE.best, total);
    SAVE.scores.push({ score: total, id: id, at: Date.now() });
    SAVE.scores.sort((a, b) => b.score - a.score);
    SAVE.scores = SAVE.scores.slice(0, 20);
    SAVE.gems += gems;
    save(); paintGems(); renderRankCloud();

    $('#clearStars').innerHTML = '<b>' + '★'.repeat(stars) + '</b><span>' + '★'.repeat(3 - stars) + '</span>';
    $('#clearTitle').textContent = stars === 3 ? '완벽한 분개!' : '분개 완성!';
    $('#clearScore').textContent = won(total);
    $('#clearBreakdown').innerHTML =
      '<span>기본 500</span><span>블록 ' + won(P.earned) + '</span>' + (P.penalty ? '<span>실수 −' + won(P.penalty) + '</span>' : '') + '<span>속도 +' + won(speed) + '</span>' +
      '<span>여유 +' + won(room) + '</span><span>콤보 +' + won(comboBonus) + '</span>' +
      (lineBonus ? '<span>줄터짐 +300</span>' : '') + '<span>💎 +' + gems + '</span>';
    $('#clearJournal').innerHTML = journalHTML(P.st);
    $('#clearExplain').textContent = P.st.explain || '';
    $('#ovClear').hidden = false;

    fx.confetti(300); fx.fireworks(4);
    setTimeout(function () { if (!document.hidden) fx.confetti(140); }, 700);
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
    if (!P || P.done || P.settling) return;
    const cost = { undo: 3, clean: 8, hint: 2 }[name];
    if (SAVE.gems < cost) { toast('보석이 모자라요 (필요 💎' + cost + ')'); SOUND.play('wrong'); return; }
    if (name === 'undo') {
      const h = P.history.pop();
      if (!h) { toast('되돌릴 배치가 없어요'); return; }
      Object.assign(P, h);
      clearTimeout(tipTimer);
      $('#placementTip').hidden = true;
      boardEl.classList.remove('placement-shake');
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
      const w = window.innerWidth, h = window.innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
    resize();
    let lastT = 0;
    function loop(ts) {
      const W = window.innerWidth, H = window.innerHeight;
      const now = ts || (window.performance && performance.now ? performance.now() : Date.now());
      let dt = lastT ? (now - lastT) / 16.667 : 1;
      lastT = now;
      if (!(dt > 0)) dt = 1;
      dt = Math.max(0.2, Math.min(3, dt));
      ctx2.clearRect(0, 0, W + 4, H + 4);
      parts = parts.filter((p) => p.life > 0 && p.y < H + 140);
      parts.forEach((p) => {
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const dg = Math.pow(p.drag, dt);
        p.vx *= dg; p.vy *= dg;
        ctx2.globalAlpha = Math.max(0, Math.min(1, p.life / 45));
        ctx2.save();
        ctx2.translate(p.x, p.y);
        ctx2.rotate(p.rot += p.vr * dt);
        if (p.type === 'c') {
          ctx2.fillStyle = p.color;
          ctx2.fillRect(-p.s / 2, -p.s * 0.32, p.s, p.s * 0.64);
          ctx2.fillStyle = 'rgba(255,255,255,.5)';
          ctx2.fillRect(-p.s / 2, -p.s * 0.32, p.s, p.s * 0.2);
        } else if (p.type === 'ribbon') {
          ctx2.fillStyle = p.color;
          ctx2.fillRect(-p.s * 0.16, -p.s * 0.72, p.s * 0.32, p.s * 1.44);
        } else if (p.type === 'dot') {
          ctx2.fillStyle = p.color;
          ctx2.beginPath(); ctx2.arc(0, 0, p.s * 0.38, 0, Math.PI * 2); ctx2.fill();
        } else if (p.type === 'spark') {
          ctx2.strokeStyle = p.color; ctx2.lineWidth = Math.max(2, p.s * 0.24);
          ctx2.beginPath(); ctx2.moveTo(0, 0); ctx2.lineTo(-p.vx * 2.4, -p.vy * 2.4); ctx2.stroke();
        } else if (p.type === 'ring') {
          ctx2.strokeStyle = p.color; ctx2.lineWidth = Math.max(1, 5 * (p.life / 50));
          ctx2.beginPath(); ctx2.arc(0, 0, p.r += 5, 0, Math.PI * 2); ctx2.stroke();
        }
        ctx2.restore();
      });
      ctx2.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(loop);
      else { raf = null; lastT = 0; ctx2.clearRect(0, 0, W + 4, H + 4); }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    const COLORS = ['#ffe066', '#ff6f91', '#4be3b0', '#5ec2ff', '#b98cff', '#ffb020', '#ff9ede', '#8affd8'];
    return {
      shards: function (centers, combo) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (const [x, y] of centers) {
          for (let i = 0; i < Math.min(9, 4 + combo); i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * (3 + combo * .3);
            parts.push({ type: 'c', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
              g: .2, drag: .96, s: 3 + Math.random() * 4, color: COLORS[i % COLORS.length],
              rot: angle, vr: .3, life: 22 + Math.random() * 15 });
          }
        }
        kick();
      },
      /* 화면 전체로 터지는 꽃가루: 좌우 대포 + 위에서 쏟아지는 다색 종이 */
      confetti: function (n) {
        const w = window.innerWidth, h = window.innerHeight;
        const total = Math.max(70, n || 70);
        for (let i = 0; i < total; i++) {
          const left = i % 2 === 0;
          const kind = i % 11 === 0 ? 'ribbon' : i % 7 === 0 ? 'dot' : 'c';
          parts.push({
            type: kind,
            x: left ? -20 : w + 20,
            y: h * (0.08 + Math.random() * 0.6),
            vx: (left ? 1 : -1) * (5 + Math.random() * 12),
            vy: -(4 + Math.random() * 10),
            g: 0.12 + Math.random() * 0.09, drag: 0.996,
            s: 9 + Math.random() * 12,
            color: COLORS[i % COLORS.length],
            rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.55,
            life: 210 + Math.random() * 130
          });
        }
        for (let i = 0; i < Math.round(total * 0.5); i++) {
          parts.push({
            type: i % 6 === 0 ? 'ribbon' : 'c',
            x: w * 0.5 + (Math.random() - 0.5) * w * 0.92,
            y: -30 - Math.random() * h * 0.35,
            vx: (Math.random() - 0.5) * 7,
            vy: 2 + Math.random() * 5,
            g: 0.09 + Math.random() * 0.06, drag: 0.997,
            s: 9 + Math.random() * 13,
            color: COLORS[(i + 3) % COLORS.length],
            rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.5,
            life: 240 + Math.random() * 150
          });
        }
        kick();
      },
      firework: function (x, y) {
        const w = window.innerWidth, h = window.innerHeight;
        const cx = x == null ? w * (0.2 + Math.random() * 0.6) : x;
        const cy = y == null ? h * (0.15 + Math.random() * 0.3) : y;
        const col = COLORS[Math.floor(Math.random() * COLORS.length)];
        for (let i = 0; i < 40; i++) {
          const a = (Math.PI * 2 * i) / 40, sp = 3 + Math.random() * 5.5;
          parts.push({ type: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.06, drag: 0.96, s: 6, color: i % 3 === 0 ? '#fff' : col, rot: 0, vr: 0, life: 60 + Math.random() * 22 });
        }
        parts.push({ type: 'ring', x: cx, y: cy, vx: 0, vy: 0, g: 0, drag: 1, r: 4, color: '#fff', life: 44, s: 4, rot: 0, vr: 0 });
        kick();
      },
      fireworks: function (n) { for (let i = 0; i < (n || 3); i++) setTimeout(() => this.firework(), i * 230); }
    };
  })();

  /* ───────── 화면: 홈 · 실시간 랭킹 ───────── */
  /* 혼자서도 겨룰 수 있는 '게임 친구' 기준 점수 (친구들 실제 기록은 각자 기기에 쌓인다) */
  const RIVALS = [
    { name: '모아', emoji: '🐣', score: 3200 },
    { name: '별이', emoji: '⭐', score: 2700 },
    { name: '보석이', emoji: '💎', score: 2250 },
    { name: '콤보', emoji: '🔥', score: 1850 },
    { name: '블록이', emoji: '🧩', score: 1500 }
  ];
  const MEDALS = ['🥇', '🥈', '🥉', '4', '5', '6', '7', '8'];
  function rankEntries() {
    const list = RIVALS.map((r) => ({ name: r.name, emoji: r.emoji, score: r.score, me: false }));
    list.push({ name: '나', emoji: '🙋', score: SAVE.best || 0, me: true });
    list.sort((a, b) => (b.score - a.score) || (a.me ? -1 : 1));
    return list;
  }
  function renderRankCloud() {
    const host = $('#rankCloud');
    if (!host) return;
    const list = rankEntries();
    const top = list.slice(0, 5);
    const myRank = list.findIndex((x) => x.me) + 1;
    host.innerHTML =
      '<div class="rc-head"><i class="live-dot"></i>실시간 1~5위</div>' +
      '<ol class="rc-list">' + top.map((r, i) =>
        '<li class="rc-row' + (r.me ? ' me' : '') + '">' +
        '<span class="rc-no">' + (MEDALS[i] || (i + 1)) + '</span>' +
        '<span class="rc-av">' + r.emoji + '</span>' +
        '<span class="rc-nm">' + r.name + '</span>' +
        '<b class="rc-sc">' + won(r.score) + '</b></li>').join('') + '</ol>' +
      (myRank > 5 ? '<div class="rc-me">내 최고 <b>' + won(SAVE.best || 0) + '</b> · ' + myRank + '위</div>' : '');
  }

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
    renderRankCloud();
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

  /* 문제 풀(challenge.js) 로테이션 큐 — 최근에 푼 문제는 뒤로 보내 연속 중복을 막는다 */
  function buildQueue(pool) {
    const recent = SAVE.recent || [];
    const fresh = shuffle(pool.filter((x) => recent.indexOf(x.id) < 0).map((x) => x.id));
    const old = shuffle(pool.filter((x) => recent.indexOf(x.id) >= 0).map((x) => x.id));
    return fresh.concat(old);
  }
  function nextPoolItem() {
    const pool = (window.BlastChallenge || []).filter((x) => x && x.id && x.answer);
    if (!pool.length) return null;
    const byId = {};
    pool.forEach((x) => { byId[x.id] = x; });
    if (!Array.isArray(SAVE.queue) || !SAVE.queue.length) SAVE.queue = buildQueue(pool);
    let qid = SAVE.queue.shift();
    let guard = 0;
    while (qid && SAVE.lastQid === qid && SAVE.queue.length && guard++ < 6) {
      SAVE.queue.push(qid); qid = SAVE.queue.shift();
    }
    const item = byId[qid] || pool[Math.floor(Math.random() * pool.length)];
    SAVE.lastQid = item.id;
    SAVE.recent = ((SAVE.recent || []).concat(item.id)).slice(-20);
    save();
    return {
      id: item.id,
      type: item.type,
      q: item.q,
      opts: item.type === 'choice' ? shuffle(item.opts.slice()).map((label) => ({ label: label, ok: label === item.answer })) : null,
      answer: String(item.answer),
      hint: item.hint,
      tag: item.tag || item.area,
      unit: item.area,
      level: item.level,
      explain: item.explain,
      st: null
    };
  }

  function challengeStage() {
    if (P && P.st) return P.st;
    const last = SAVE.last || { corner: 'inv', stage: 1 };
    return D.STAGES[last.corner][Math.min(last.stage, D.STAGES[last.corner].length) - 1];
  }
  function makeChallenge() {
    const pooled = nextPoolItem();
    if (pooled) return pooled;
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
    if (st.amountPhase) {
      const dSum = entries.filter((e) => e.side === 'd').reduce((a, b) => a + b.amount, 0);
      return {
        st: st, type: 'type-amount',
        q: '차변 합계 금액은 얼마일까요? (원)',
        answer: String(dSum), tag: st.tag || '금액 계산',
        hint: '거래 문장의 숫자를 더해 보세요. 콤마 없이 입력해도 돼요.'
      };
    }
    // 금액이 문장에 그대로 보이는 단계는 계정 문제로 돌린다
    const target2 = pickOne(entries);
    return {
      st: st, type: 'choice',
      q: (target2.side === 'd' ? '차변' : '대변') + '에 올 계정과목은 무엇일까요?',
      opts: shuffle([{ label: target2.account, ok: true }].concat(accountOptions(target2.account, 3).map((a) => ({ label: a, ok: false })))),
      answer: target2.account, tag: st.tag || '분개', hint: st.prompt
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
    SOUND.start();
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
    tag.textContent = '#' + (CH.tag || '개념') + ' · ' + (CH.unit ? CH.unit + ' · ' + CH.level : cornerName(CH.st.corner) + ' ' + CH.st.stage + '단계');
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
      inp.placeholder = (CH.type === 'type-amount' || CH.type === 'amount') ? '예: 300000' : '계정과목 입력';
      inp.inputMode = (CH.type === 'type-amount' || CH.type === 'amount') ? 'numeric' : 'text';
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

  function answerText() {
    if ((CH.type === 'amount' || CH.type === 'type-amount') && /^\d+$/.test(CH.answer)) return won(Number(CH.answer)) + '원';
    return CH.answer;
  }

  function answerChallenge(given) {
    if (CH.answered) return;
    CH.answered = true;    if (CH.tick) { clearInterval(CH.tick); CH.tick = null; }
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
      P && ((P.earned += score));
      SAVE.gems += gems;
      SAVE.best = Math.max(SAVE.best, score);
      save(); paintGems();
      $('#chGems').textContent = SAVE.gems;
      res.className = 'ch-result ok';
      res.innerHTML = '🎉 정답! +' + won(score) + '점 · 💎 +' + gems + ' (남은 ' + left + '초 보너스)<br><b>' + answerText() + '</b>' + (CH.explain ? '<br>' + CH.explain : '');
      fx.confetti(220); fx.fireworks(3);
      SOUND.play('right'); SOUND.play('applause'); SOUND.play('whistle');
    } else {
      res.className = 'ch-result no';
      res.innerHTML = (given == null ? '⏰ 시간 초과! ' : '') + '정답은 <b>' + answerText() + '</b>예요.' +
        (CH.explain ? '<br>' + CH.explain : '');
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
      const id = CH.id || (CH.st && CH.st.id);
      if (id && SAVE.wrong.indexOf(id) < 0) { SAVE.wrong.push(id); save(); }
    }
  }

  /* ───────── 상점 ───────── */
  const SHOP = [
    { k: 'undo', ico: '↩️', nm: '다시하기', ds: '마지막 배치를 되돌려요 (게임 중)', cost: 3 },
    { k: 'clean', ico: '🧹', nm: '보드 정리', ds: '잠금 상자 3개 제거 + 아래 2줄 정리', cost: 8 },
    { k: 'hint', ico: '💡', nm: '힌트', ds: '정답 조각과 놓을 자리를 알려 줘요', cost: 2 }
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
      b.textContent = '💎 ' + it.cost;
      b.disabled = SAVE.gems < it.cost;
      b.addEventListener('click', () => {
        if (!P || P.done) { toast('게임 중에만 쓸 수 있어요. 먼저 스테이지를 시작해요'); return; }
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
    const list = rankEntries();
    let html = '<p class="section-desc">친구들 실제 기록은 각자 기기에 쌓여요. 모아·별이·보석이는 혼자서도 겨룰 수 있게 넣은 <b>게임 친구</b> 기준 점수예요.</p>';
    list.slice(0, 8).forEach((r, i) => {
      html += '<div class="rank-row' + (r.me ? ' me' : '') + '">' +
        '<span class="no">' + (i + 1) + '</span><span class="av">' + r.emoji + '</span>' +
        '<span>' + r.name + '</span>' +
        '<span class="sc">' + won(r.score) + '점</span></div>';
    });
    html += '<p class="section-desc" style="margin-top:12px">최고 점수 <b>' + won(SAVE.best || 0) + '점</b> · 클리어한 단계 ' + Object.keys(SAVE.stars).length + '개</p>';
    const rows = SAVE.scores.slice(0, 6);
    if (rows.length) {
      html += '<p class="section-desc" style="margin-top:8px">내가 세운 단계 기록</p>';
      rows.forEach((r, i) => {
        const st = r.id.split('-');
        html += '<div class="rank-row"><span class="no">' + (i + 1) + '</span><span>' + cornerName(st[0]) + ' ' + st[1] + '단계</span><span class="sc">' + won(r.score) + '점</span></div>';
      });
    }
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
    if (e.target.closest('[data-back]')) {
      if (CH && CH.tick) { clearInterval(CH.tick); CH.tick = null; }
      show('screen-home'); renderHome();
    }
  });

  /* ───────── 바인딩 ───────── */
  $('#btnPlay').addEventListener('click', () => {
    const last = SAVE.last || { corner: 'inv', stage: 1 };
    const next = D.STAGES[last.corner][Math.min(last.stage, D.STAGES[last.corner].length) - 1];
    startStage(last.corner, next.stage);
  });
  $('#btnChallenge').addEventListener('click', openChallenge);
  $('#itemChallenge').addEventListener('click', () => {
    if (!P || P.done || P.settling) return;
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
  function paintTrack(t) {
    const el = $('#musicTrack');
    if (!el) return;
    const info = t || (SOUND.track ? SOUND.track() : null);
    if (info) el.textContent = '♪ ' + (info.index + 1) + '/' + info.total;
  }
  if (SOUND.setOnTrack) SOUND.setOnTrack(paintTrack);
  paintTrack();
  renderHome();
  paintGems();
  SOUND.set(SAVE.music !== false);
  paintTrack();

  /* 테스트용 읽기 전용 훅 */
  window.__blast = {
    state: function () {
      return P ? {
        corner: P.cornerKey, stage: P.stageNo, score: playScore(), earned: P.earned, penalty: P.penalty, combo: P.combo, comboMoves: P.comboMoves,
        mission: P.mission.map((m) => ({ side: m.side, account: m.account, filled: m.filled })),
        tray: P.tray.map((p) => p && { key: p.key, pure: !!p.pure, cells: p.cells, shape: p.shape, side: p.side }),
        obstacles: Array.from(P.obst), gridFilled: P.grid.filter(Boolean).length,
        done: P.done, over: P.over, gems: SAVE.gems
      } : { gems: SAVE.gems, stars: Object.keys(SAVE.stars).length };
    },
    start: startStage,
    challenge: makeChallenge,
    /* 개발·검수용 읽기 훅 */
    spots: function (slot) {
      if (!P) return [];
      const pc = P.tray[slot];
      if (!pc) return [];
      return placements(pc, P.grid, P.obst, pc.side || 'any');
    },
    confetti: function (n) { fx.confetti(n || 120); },
    firework: function () { fx.firework(); },
    /* 개발용: 줄 터짐·콤보 확인 */
    testFill: function (row, acc) {
      if (!P) return null;
      for (let c = 0; c < 8; c++) { const i = row * 8 + c; if (!P.grid[i]) P.grid[i] = { key: acc || '현금', cat: 'c-asset', sealed: false }; }
      return P.grid.filter(Boolean).length;
    },
    testTurn: function () { const r = resolveLines(); updateStreak(r); finishTurn(); return r.count; }
  };
})();
