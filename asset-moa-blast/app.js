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
  function isAccount(name) { return !!ACCT[name]; }
  function sideOf(name) { return ACCT[name] ? (ACCT[name].inc === '대변' ? 'c' : 'd') : null; }

  /* ───────── 조각 모양 카탈로그 ─────────
     ㄱ·ㄴ(대 3×3 / 소 2×2) · ㅁ(3×3 · 2×2 · 1×1) · ㅡ(2·3·4) · ㅣ(2·3·4) · ＋(3×3 십자)
     각 모양은 가중치(w)만큼 주머니에 들어가서, 한 단계 안에서 확률적으로 랜덤 등장한다. */
  const SH = (n, c, w) => ({ n: n, c: c, w: w });
  const SHAPES = [
    SH('ㅁ1', [[0, 0]], 3),                                   /* ㅁ 작은 거 (1×1) */
    SH('ㅡ2', [[0, 0], [0, 1]], 4),
    SH('ㅣ2', [[0, 0], [1, 0]], 4),
    SH('ㅡ3', [[0, 0], [0, 1], [0, 2]], 4),
    SH('ㅣ3', [[0, 0], [1, 0], [2, 0]], 4),
    SH('ㅡ4', [[0, 0], [0, 1], [0, 2], [0, 3]], 3),
    SH('ㅣ4', [[0, 0], [1, 0], [2, 0], [3, 0]], 3),
    SH('ㅁ2', [[0, 0], [0, 1], [1, 0], [1, 1]], 4),            /* ㅁ 큰 거 (2×2) */
    SH('ㅁ3', [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], 0.6), /* ㅁ 큰 거 (3×3) */
    SH('ㄱ소', [[0, 0], [0, 1], [1, 1]], 2),
    SH('역ㄱ소', [[0, 0], [0, 1], [1, 0]], 2),
    SH('ㄴ소', [[0, 0], [1, 0], [1, 1]], 2),
    SH('역ㄴ소', [[0, 1], [1, 0], [1, 1]], 2),
    SH('ㄱ', [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], 2),      /* ㄱ 큰 거 (3×3, 5칸) */
    SH('역ㄱ', [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], 2),
    SH('ㄴ', [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 2),      /* ㄴ 큰 거 (3×3, 5칸) */
    SH('역ㄴ', [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], 2),
    SH('+', [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], 2)        /* ＋ (3×3 십자) */
  ];
  function shapeBox(sp) {
    const rows = Math.max.apply(null, sp.c.map((x) => x[0])) + 1;
    const cols = Math.max.apply(null, sp.c.map((x) => x[1])) + 1;
    return { rows: rows, cols: cols };
  }
  function shapeBag(list) {
    const bag = [];
    list.forEach((s) => {
      const w = Math.max(1, Math.round((s.w || 1) * 10));
      for (let i = 0; i < w; i++) bag.push(s);
    });
    return bag;
  }
  const SHAPE_BAG = shapeBag(SHAPES);
  function shapeWeighted() { return SHAPE_BAG[Math.floor(Math.random() * SHAPE_BAG.length)]; }

  /* 계정과목 조각 전용 모양 — 이름표가 블록 위에 읽히도록 2칸 이상 넓고 4칸 이하인 것만 */
  const ACCT_SHAPES = [
    { n: 'ㅡ2', c: [[0, 0], [0, 1]], w: 3 },
    { n: 'ㅡ3', c: [[0, 0], [0, 1], [0, 2]], w: 3 },
    { n: 'ㅁ2', c: [[0, 0], [0, 1], [1, 0], [1, 1]], w: 4 },
    { n: 'ㄱ소', c: [[0, 0], [0, 1], [1, 1]], w: 2 },
    { n: '역ㄱ소', c: [[0, 0], [0, 1], [1, 0]], w: 2 },
    { n: 'ㄴ소', c: [[0, 0], [1, 0], [1, 1]], w: 2 },
    { n: '역ㄴ소', c: [[0, 1], [1, 0], [1, 1]], w: 2 }
  ];
  const ACCT_BAG = shapeBag(ACCT_SHAPES);
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

  /* 순수 색 블록 조각 — 진짜 블록 블라스트 놀이용. 계정과목이 아니라 어디든 놓을 수 있고,
     줄을 터뜨려 점수를 벌어 준다. */
  const PURE_CATS = ['c-pure1', 'c-pure2', 'c-pure3', 'c-pure4', 'c-pure5'];
  function newPurePiece(usedCats) {
    let guard = 0;
    while (guard++ < 30) {
      const sp = shapeWeighted();
      const avail = PURE_CATS.filter((c) => !usedCats || !usedCats[c]);
      const pool = avail.length ? avail : PURE_CATS;
      const pc = {
        key: null, pure: true, cat: pool[Math.floor(Math.random() * pool.length)],
        cells: sp.c, shape: sp.n, side: null, id: rid()
      };
      if (!P) return pc;
      if (placements(pc, P.grid, P.obst, 'any').length) return pc;
    }
    return { key: null, pure: true, cat: PURE_CATS[0], cells: SHAPES[0].c, shape: '1', side: null, id: rid() };
  }

  /* 계정과목 조각 — 차변/대변 제 존에만 놓을 수 있고, 놓으면 분개 칸이 채워진다. */
  function newAccountPiece(key, sideHint) {
    const cat = catClass(key);
    const side = sideHint || 'any';
    const pool = ACCT_BAG;
    let guard = 0;
    while (guard++ < 60) {
      const sp = pickOne(pool);
      const pc = { key: key, pure: false, cat: cat, cells: sp.c, shape: sp.n, side: side === 'any' ? null : side, id: rid() };
      if (!P) return pc;
      if (placements(pc, P.grid, P.obst, side).length) return pc;
    }
    return null; // 지금은 이 존에 놓을 자리가 없다 → 다음 트레이에서 다시
  }

  const CORNER_POOL = {};
  function cornerAccounts(key) {
    if (CORNER_POOL[key]) return CORNER_POOL[key];
    const set = {};
    (D.STAGES[key] || []).forEach((st) => {
      (st.entries || []).forEach((e) => { if (e.account) set[e.account] = 1; });
      (st.picks || []).forEach((p) => { if (isAccount(p.label)) set[p.label] = 1; });
    });
    CORNER_POOL[key] = Object.keys(set);
    return CORNER_POOL[key];
  }

  /* 트레이 3칸 = 일반 블록 + 계정과목 블록의 혼합.
     블록을 하나 놓는 순간 그 칸에 새 블록이 바로 채워진다(즉시 리필).
     계정과목 블록은 42% 확률로 등장하고, 3번 연속 안 나오면 강제로 한 번 나온다.
     (트레이에 계정과목 블록이 하나도 없으면 그것도 강제 → 분개를 못 채우고 막히는 일이 없다) */
  function trayAccountKeys(exceptSlot) {
    const set = {};
    P.tray.forEach((p, i) => { if (p && !p.pure && i !== exceptSlot) set[p.key] = 1; });
    return set;
  }
  function refillSlot(slot) {
    const open = P.mission.filter((m) => !m.filled);
    const have = trayAccountKeys(slot);
    let piece = null;
    const wantAcc = open.length > 0 && (
      Object.keys(have).length === 0 ||
      (P.sinceAcc || 0) >= 3 ||
      Math.random() < 0.42
    );
    if (wantAcc) {
      const pool = shuffle(open.filter((m) => !have[m.account]));
      for (let i = 0; i < pool.length; i++) {
        const pc = newAccountPiece(pool[i].account, pool[i].side);
        if (pc) { piece = pc; P.sinceAcc = 0; break; }
      }
    }
    if (!piece) {
      const usedCats = {};
      P.tray.forEach((p, i) => { if (p && p.pure && i !== slot) usedCats[p.cat] = 1; });
      piece = newPurePiece(usedCats);
      P.sinceAcc = (P.sinceAcc || 0) + 1;
    }
    P.tray[slot] = piece;
    P.spawnSlot = slot;
  }
  function refillTray() {
    P.tray = [null, null, null];
    P.sinceAcc = 0;
    for (let i = 0; i < 3; i++) refillSlot(i);
    P.spawnSlot = -1;
    renderTray();
  }

  function anyTrayFits() {
    return P.tray.some((p) => p && placements(p, P.grid, P.obst, 'any').length > 0);
  }

  /* ───────── 렌더 ───────── */
  /* 글자를 주어진 상자 안에 꼭 맞게 줄여 넣는다(잘림 없이 최대한 크게) */
  const measureCtx = document.createElement('canvas').getContext('2d');
  function fitFontSize(text, maxW, maxH, base, min) {
    let s = base;
    while (s > min) {
      measureCtx.font = '900 ' + s + 'px Pretendard,system-ui,-apple-system,sans-serif';
      const w = measureCtx.measureText(text).width;
      if (w <= maxW - 2 && s * 1.06 <= maxH) break;
      s -= 0.5;
    }
    return Math.max(min, s);
  }
  function fitText(el, text, maxW, maxH, base, min) {
    el.style.fontSize = fitFontSize(text, maxW, maxH, base, min) + 'px';
  }

  function renderBoard(animSet) {
    boardEl.innerHTML = '';
    const groups = {};
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = idx(r, c), v = P.grid[i];
      const d = document.createElement('div');
      d.className = 'cell ' + (c < 4 ? 'debit' : 'credit');
      d.dataset.i = String(i);
      d.setAttribute('role', 'gridcell');
      d.setAttribute('aria-label', (c < 4 ? '차변 ' : '대변 ') + (r + 1) + '행 ' + (c % 4 + 1) + '열' + (v && v.key ? ' · ' + v.key : (v && v.pure ? ' · 블록' : (P.obst.has(i) ? ' · 잠금 상자' : ' · 빈 칸'))));
      if (P.obst.has(i)) d.classList.add('obstacle');
      else if (v) {
        const b = document.createElement('div');
        b.className = 'blk ' + v.cat + (v.sealed ? ' sealed' : '') + (v.pure ? ' pure' : ' acct');
        d.appendChild(b);
        if (animSet && animSet.has(i)) { d.classList.add('drop-anim'); }
        if (v.key && v.gid) {
          const g = groups[v.gid] || (groups[v.gid] = { key: v.key, minR: r, maxR: r, minC: c, maxC: c });
          if (r < g.minR) g.minR = r; if (r > g.maxR) g.maxR = r;
          if (c < g.minC) g.minC = c; if (c > g.maxC) g.maxC = c;
        }
      }
      boardEl.appendChild(d);
    }
    Object.keys(groups).forEach((gid) => paintAccTag(groups[gid]));
  }

  /* 계정과목 블록 위에 이름표 하나 — 지금보다 2배 이상 큰 글자, 블록 밖으로 넘치지 않게 자동 맞춤 */
  function paintAccTag(g) {
    const a = boardEl.querySelector('.cell[data-i="' + idx(g.minR, g.minC) + '"]');
    const b = boardEl.querySelector('.cell[data-i="' + idx(g.maxR, g.maxC) + '"]');
    if (!a || !b) return;
    const x = a.offsetLeft, y = a.offsetTop;
    const w = b.offsetLeft + b.offsetWidth - x;
    const h = b.offsetTop + b.offsetHeight - y;
    const tag = document.createElement('div');
    tag.className = 'acc-tag';
    tag.textContent = g.key;
    tag.style.left = x + 'px';
    tag.style.top = y + 'px';
    tag.style.width = w + 'px';
    tag.style.height = h + 'px';
    boardEl.appendChild(tag);
    fitText(tag, g.key, w - 4, h - 4, 24, 9);
  }

  function trayMetrics() {
    const w = trayEl.clientWidth || 372;
    const h = trayEl.clientHeight || 130;
    return { slotW: Math.max(72, w / 3 - 6), slotH: Math.max(84, h - 12) };
  }
  /* 조각마다 칸 크기를 줄여 트레이 밖으로 절대 넘치지 않게 */
  function pieceCellSize(pc) {
    const avail = Math.min(112, (trayEl.clientHeight || 130) - 18);
    const box = shapeBox({ c: pc.cells });
    const base = window.innerWidth <= 350 ? 23 : window.innerWidth <= 400 ? 27 : 30;
    const gap = 3;
    const badge = pc.pure ? 4 : 30;
    const byH = Math.floor((avail - badge - (box.rows - 1) * gap) / box.rows);
    const byW = Math.floor((trayMetrics().slotW - (box.cols - 1) * gap) / box.cols);
    return Math.max(13, Math.min(base, byH, byW));
  }

  function renderTray() {
    trayEl.innerHTML = '';
    let any = false;
    const tm = trayMetrics();
    const nameBase = window.innerHeight <= 700 ? 16 : window.innerWidth >= 600 ? 22 : 20;
    P.tray.forEach((pc, si) => {
      const wrap = document.createElement('div');
      wrap.className = 'slot-piece' + (P.spawnSlot === si ? ' spawn' : '');
      if (!pc) { trayEl.appendChild(wrap); return; }
      any = true;
      const cs = pieceCellSize(pc);
      const box = shapeBox({ c: pc.cells });
      const el = document.createElement('div');
      el.className = 'piece' + (pc.pure ? ' pure' : ' acct');
      el.style.gap = '3px';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', pc.pure
        ? '블록 조각 · 어디든 놓아 한 줄을 터뜨려요'
        : pc.key + ' 조각 · ' + (pc.side === 'd' ? '차변' : pc.side === 'c' ? '대변' : '제') + ' 자리에 놓아 분개를 완성하세요');
      el.tabIndex = 0;
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectPiece(si); }
      });
      el.dataset.slot = String(si);
      el.style.gridTemplateColumns = 'repeat(' + box.cols + ', ' + cs + 'px)';
      el.style.gridTemplateRows = 'repeat(' + box.rows + ', ' + cs + 'px)';
      const map = {};
      pc.cells.forEach(([r, c]) => { map[r + ':' + c] = 1; });
      for (let r = 0; r < box.rows; r++) for (let c = 0; c < box.cols; c++) {
        const cell = document.createElement('div');
        if (map[r + ':' + c]) cell.className = 'pcell ' + pc.cat;
        else cell.style.visibility = 'hidden';
        el.appendChild(cell);
      }
      wrap.appendChild(el);
      if (!pc.pure) {
        const nm = document.createElement('span');
        nm.className = 'piece-name acct';
        nm.textContent = pc.key;
        wrap.appendChild(nm);
        fitText(nm, pc.key, tm.slotW - 24, 34, nameBase, 12);
      }
      trayEl.appendChild(wrap);
    });
    if (!any) {
      const d = document.createElement('div');
      d.className = 'tray-empty';
      d.textContent = '조각을 불러오는 중…';
      trayEl.appendChild(d);
    }
    P.spawnSlot = -1;
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
  let sel = null; // {slot} 탭으로 고른 조각

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
    drag = { piece: pc, slot: si, offR: offR, offC: offC, ghost: null, preview: [], startX: e.clientX, startY: e.clientY, moved: false };
    buildGhost(pc, e.clientX, e.clientY, m);
    pEl.classList.add('gone');
    moveDrag(e.clientX, e.clientY);
    try { pEl.setPointerCapture(e.pointerId); } catch (err) {}
  });

  function buildGhost(pc, x, y, m) {
    const g = document.createElement('div');
    g.className = 'piece' + (pc.pure ? ' pure' : ' acct');
    const box = shapeBox({ c: pc.cells });
    const rows = box.rows, cols = box.cols;
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
        d.className = 'blk ' + pc.cat + (pc.pure ? ' pure' : ' acct');
        d.style.position = 'relative';
        d.style.borderRadius = '7px';
      } else d.style.visibility = 'hidden';
      g.appendChild(d);
    }
    if (!pc.pure) {
      const tag = document.createElement('div');
      tag.className = 'acc-tag';
      tag.textContent = pc.key;
      tag.style.inset = '0';
      tag.style.width = 'auto';
      tag.style.height = 'auto';
      g.appendChild(tag);
      dragLayer.appendChild(g);
      drag.ghost = g;
      drag.size = s;
      fitText(tag, pc.key, cols * s + (cols - 1) * 3 - 4, rows * s + (rows - 1) * 3 - 4, 24, 9);
      return;
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
    if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 8) drag.moved = true;
    if (!drag.moved) return;
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
    if (d.target && d.moved) { tryPlace(d.piece, d.slot, d.target.r, d.target.c); return; }
    if (!d.moved) selectPiece(d.slot);
  });

  function selectPiece(slot) {
    if (!P || P.over || P.done) return;
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
  document.addEventListener('pointercancel', function () {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.ghost) d.ghost.remove();
    clearPreview();
    const pieceEl = trayEl.querySelector('.piece[data-slot="' + d.slot + '"]');
    if (pieceEl) pieceEl.classList.remove('gone');
  });

  /* 보드 탭 배치 (드래그 보조) */
  boardEl.addEventListener('click', function (e) {
    if (!sel || !P || P.over || P.done) return;
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

  /* ───────── 배치 ───────── */
  function paintScore(bump) {
    const el = $('#playScore');
    el.textContent = won(P.score);
    if (bump) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }
  function addScore(n, bump) {
    P.earned = (P.earned || 0) + n;
    P.score = Math.max(0, P.earned - (P.penalty || 0));
    paintScore(bump !== false);
  }

  /* 잘못된 분개 위치 → 감점 + 짧은 학습 팁 + 올바른 쪽 표시 */
  function wrongSideTip(piece, miss) {
    const a = ACCT[piece.key] || {};
    const need = miss.side === 'd' ? '차변' : '대변';
    const drop = 30;
    P.penalty = (P.penalty || 0) + drop;
    P.score = Math.max(0, (P.earned || 0) - P.penalty);
    P.combo = 0;
    P.mistakes = (P.mistakes || 0) + 1;
    SOUND.play('wrong');
    paintScore(true);
    flashText('−' + drop, 'bad');
    shakeBoard();
    highlightSide(miss.side);
    const why = a.ex || a.desc || (piece.key + ' 계정의 자리를 다시 확인해 보세요.');
    const floorNote = ((P.earned || 0) - P.penalty) < 0 ? ' (점수는 0에서 멈춰요)' : '';
    showTip('❌ ' + piece.key + '은(는) ' + need + ' 칸!  −' + drop + '점', why + floorNote);
  }

  function tryPlace(piece, slot, r0, c0) {
    if (!canPlace(piece, r0, c0, P.grid, P.obst)) return;
    const miss = piece.pure ? null : P.mission.filter((m) => !m.filled && m.account === piece.key)[0];
    if (miss && miss.side !== 'any' && !inSide(piece, r0, c0, miss.side)) {
      wrongSideTip(piece, miss);
      return;
    }
    // 히스토리 저장
    P.history.push({
      grid: P.grid.slice(),
      obst: new Set(P.obst),
      mission: P.mission.map((m) => Object.assign({}, m)),
      tray: P.tray.slice(),
      score: P.score, earned: P.earned, penalty: P.penalty, combo: P.combo
    });
    if (P.history.length > 40) P.history.shift();

    const gid = piece.pure ? null : rid();
    const anim = new Set();
    cellsFor(piece, r0, c0).forEach(([r, c]) => {
      const i = idx(r, c);
      P.grid[i] = { key: piece.key, cat: piece.cat, pure: !!piece.pure, sealed: false, gid: gid };
      anim.add(i);
    });
    SOUND.play('place');

    // 미션 채움
    if (miss) {
      miss.filled = true;
      cellsFor(piece, r0, c0).forEach(([r, c]) => { P.grid[idx(r, c)].sealed = true; });
      addScore(200);
      SOUND.play('right');
      setTimeout(() => bubble('✅ ' + piece.key + ' 제자리! 분개 +200'), 60);
      const slotEl = journalEl.querySelector('.jslot[data-acc="' + piece.key + '"]');
      if (slotEl) { slotEl.classList.add('pop'); }
      flashText('+200');
    } else if (piece.pure) {
      // 일반 블록은 놓는 것만으로도 점수 (블록 블라스트 손맛)
      addScore(8 * piece.cells.length);
      P.placed = (P.placed || 0) + 1;
    } else {
      // 이미 자리가 채워진 계정 블록(되돌리기 등) — 놓아도 점수는 조금
      addScore(8 * piece.cells.length);
    }

    renderBoard(anim);
    renderMission();
    paintScore(false);

    // 즉시 리필 — 놓은 자리에 바로 새 블록이 들어온다
    refillSlot(slot);
    renderTray();

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

  const LINE_PTS = [0, 300, 800, 1500, 2400, 3600, 5000, 7000, 9000];

  function afterClear(res) {
    const base = LINE_PTS[Math.min(8, res.count)] + res.obstCleared * 60;
    P.clears += res.count;
    P.combo = Math.min(9, (P.combo || 0) + 1);
    P.maxCombo = Math.max(P.maxCombo || 0, P.combo);
    const comboSwing = P.combo >= 2 ? (P.combo - 1) * 120 : 0;
    addScore(base + comboSwing);
    const goalEl = $('#missionGoal');
    if (goalEl) { goalEl.classList.add('on'); goalEl.textContent = '🎯 ' + P.clears + '줄 터뜨림!'; }
    if (P.combo >= 2) {
      const banner = $('#comboBanner');
      banner.innerHTML = 'COMBO ×' + P.combo + '<small>+' + won(base + comboSwing) + '</small>';
      banner.classList.add('show');
      clearTimeout(banner._t);
      banner._t = setTimeout(() => banner.classList.remove('show'), 1200);
      SOUND.play('combo', P.combo);
    } else {
      SOUND.play('clear', res.count);
    }
    flashText('+' + won(base + comboSwing));
    showBeams(res.lines);
    hitStop();
    if (res.count >= 1) fx.confetti(res.count >= 3 ? 170 : res.count >= 2 ? 110 : 60);
    if (res.count >= 2) fx.firework();
    if (res.count >= 3) fx.fireworks(2);
    setTimeout(() => { renderBoard(); }, 320);
  }

  /* 터진 줄 위로 빛줄기가 스쳐 지나간다 */
  function showBeams(lines) {
    lines.forEach((l) => {
      const i0 = l.type === 'row' ? idx(l.i, 0) : idx(0, l.i);
      const i1 = l.type === 'row' ? idx(l.i, 7) : idx(7, l.i);
      const a = boardEl.querySelector('.cell[data-i="' + i0 + '"]');
      const b = boardEl.querySelector('.cell[data-i="' + i1 + '"]');
      if (!a || !b) return;
      const d = document.createElement('div');
      d.className = 'beam ' + l.type;
      d.style.left = a.offsetLeft + 'px';
      d.style.top = a.offsetTop + 'px';
      d.style.width = (b.offsetLeft + b.offsetWidth - a.offsetLeft) + 'px';
      d.style.height = (b.offsetTop + b.offsetHeight - a.offsetTop) + 'px';
      boardEl.appendChild(d);
      setTimeout(() => d.remove(), 520);
    });
  }
  function hitStop() {
    boardEl.classList.remove('hit');
    void boardEl.offsetWidth;
    boardEl.classList.add('hit');
    setTimeout(() => boardEl.classList.remove('hit'), 420);
  }
  function shakeBoard() {
    const w = boardEl.parentNode;
    w.classList.remove('shake');
    void w.offsetWidth;
    w.classList.add('shake');
    setTimeout(() => w.classList.remove('shake'), 380);
  }
  function highlightSide(side) {
    const el = document.querySelector('.zone-label.' + (side === 'd' ? 'debit' : 'credit'));
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1500);
  }
  let tipTimer = null;
  function showTip(big, small) {
    const el = $('#tipCard');
    if (!el) return;
    el.innerHTML = '<b>' + big + '</b><span>' + small + '</span>';
    const m = $('#mission');
    if (m) {
      const r = m.getBoundingClientRect();
      el.style.top = Math.max(6, Math.round(r.top) - 2) + 'px';
    }
    el.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => el.classList.remove('show'), 3400);
  }

  function flashText(text, cls) {
    const d = document.createElement('div');
    d.className = 'flash-score' + (cls ? ' ' + cls : '');
    d.textContent = text;
    $('#screen-play').appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  function finishTurn() {
    if (P.done) return;
    if (P.mission.every((m) => m.filled)) { setTimeout(stageClear, 260); return; }
    if (P.tray.filter(Boolean).length < 3) {
      for (let i = 0; i < 3; i++) if (!P.tray[i]) refillSlot(i);
      renderTray();
    }
    if (!anyTrayFits()) {
      setTimeout(function () {
        if (P.done) return;
        P.over = true;
        $('#overLine').textContent = '놓을 자리가 없어요. 보드를 정리하면 계속할 수 있어요.';
        const cb = $('#ovOver').querySelector('[data-ov="continue"]');
        if (cb) cb.textContent = P.freeClean ? '🧹 보드 정리 (무료)' : '💎5 보드 정리';
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
      mission: buildMission(st), tray: [], score: 0, earned: 0, penalty: 0, mistakes: 0,
      combo: 0, maxCombo: 0, clears: 0, placed: 0, sinceAcc: 0, spawnSlot: -1, freeClean: true,
      history: [], over: false, done: false, startedAt: Date.now()
    };
    SAVE.last = { corner: cornerKey, stage: stageNo }; save();
    renderBoard();
    refillTray();
    renderMission();
    $('#playScore').textContent = '0';
    const g = $('#missionGoal');
    if (g) { g.classList.remove('on'); g.textContent = '🎯 1줄 +300 · 콤보 보너스'; }
    show('screen-play');
    SOUND.start();
    if (stageNo <= 2) bubble('일반 블록은 어디든! 계정 블록은 차변·대변 제자리에');
  }

  function stageClear() {
    if (P.done) return;
    P.done = true;
    clearTimeout(tipTimer);
    $('#tipCard').classList.remove('show');
    const sec = Math.max(1, Math.round((Date.now() - P.startedAt) / 1000));
    /* 빨리 풀수록 큰 속도 보너스 (12초까지 만점, 이후 초당 15점씩 감소) */
    const speed = Math.max(0, 900 - Math.max(0, sec - 12) * 15);
    const filled = P.grid.filter(Boolean).length;
    const room = Math.max(0, 60 - Math.max(0, filled - 10) * 3);
    const comboBonus = (P.maxCombo || 0) * 80;
    const lineBonus = P.clears * 100;
    const earned = P.earned || 0;
    const total = Math.max(0, 500 + earned + speed + room + comboBonus + lineBonus - (P.penalty || 0));
    const stars = total >= 2000 ? 3 : total >= 1300 ? 2 : 1;
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
      '<span>기본 500</span><span>블록 ' + won(earned) + '</span><span>속도 +' + won(speed) + '</span>' +
      '<span>여유 +' + won(room) + '</span><span>콤보 +' + won(comboBonus) + '</span>' +
      '<span>줄터짐 +' + won(lineBonus) + '</span>' +
      (P.penalty ? '<span class="minus">실수 −' + won(P.penalty) + '</span>' : '') +
      '<span>💎 +' + gems + '</span>';
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
      P && ((P.score += score));
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

  /* 보드 정리 — 막힘 안전장치. 첫 번째는 무료, 그다음부터 보석 5개 */
  function cleanBoard(cost) {
    if (cost > 0) {
      if (SAVE.gems < cost) { toast('보석이 모자라요 (필요 💎' + cost + ')'); SOUND.play('wrong'); return; }
      addGems(-cost);
    }
    [6, 7].forEach((r) => {
      for (let c = 0; c < N; c++) {
        const i = idx(r, c);
        if (P.grid[i] && !P.grid[i].sealed) P.grid[i] = null;
      }
    });
    let rm = 0;
    P.obst.forEach((i) => { if (rm < 4) { P.obst.delete(i); rm++; } });
    P.over = false;
    P.freeClean = false;
    renderBoard(); refillTray(); renderMission();
    SOUND.play('gem');
    toast(cost > 0 ? '💎' + cost + ' 사용 · 보드를 정리했어요' : '🧹 보드를 정리했어요 (무료 1회)');
  }

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
        cleanBoard(P.freeClean ? 0 : 5);
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

  /* 검수용 훅 (읽기 + 시나리오 재현용 동작) */
  window.__blast = {
    state: function () {
      return P ? {
        corner: P.cornerKey, stage: P.stageNo, score: P.score, earned: P.earned, penalty: P.penalty,
        combo: P.combo, maxCombo: P.maxCombo, clears: P.clears, sinceAcc: P.sinceAcc,
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
    /* 검수용: 트레이 조각을 지정 칸에 놓는다 */
    place: function (slot, r, c) {
      if (!P) return false;
      const pc = P.tray[slot];
      if (!pc) return false;
      if (!canPlace(pc, r, c, P.grid, P.obst)) return false;
      tryPlace(pc, slot, r, c);
      return true;
    },
    /* 검수용: 보드 상태를 글자 표로 */
    gridText: function () {
      if (!P) return '';
      const out = [];
      for (let r = 0; r < 8; r++) {
        const row = [];
        for (let c = 0; c < 8; c++) {
          const v = P.grid[idx(r, c)];
          row.push(P.obst.has(idx(r, c)) ? '#' : !v ? '.' : v.pure ? 'o' : String(v.key).slice(0, 2));
        }
        out.push(row.join(' '));
      }
      return out.join('\n');
    },
    /* 개발용: 줄 터짐·콤보 확인 */
    testFill: function (row, acc) {
      if (!P) return null;
      for (let c = 0; c < 8; c++) { const i = row * 8 + c; if (!P.grid[i]) P.grid[i] = { key: acc || '현금', cat: 'c-asset', sealed: false }; }
      return P.grid.filter(Boolean).length;
    },
    testTurn: function () { const r = resolveLines(); if (r.count) afterClear(r); finishTurn(); return r.count; },
    /* 검수용: 현재 트레이를 계정과목 조각으로 강제 교체 */
    forceAccount: function (slot, key, side) {
      if (!P) return false;
      const pc = newAccountPiece(key, side || 'any');
      if (!pc) return false;
      P.tray[slot] = pc;
      renderTray();
      return true;
    },
    forcePure: function (slot, shapeName) {
      if (!P) return false;
      const sp = SHAPES.filter((s) => !shapeName || s.n === shapeName)[0];
      if (!sp) return false;
      P.tray[slot] = { key: null, pure: true, cat: PURE_CATS[slot % PURE_CATS.length], cells: sp.c, shape: sp.n, side: null, id: rid() };
      renderTray();
      return true;
    }
  };
})();
