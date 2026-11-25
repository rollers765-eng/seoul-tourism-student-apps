/* 자산모아 블럭모아 Blaster v2 · 8×8 퍼즐 엔진
 *
 * const game = BlockPuzzle.createGame({ corner: 'inventory', level: 1,
 *   onEvent(event, state) { … }, snapshot: optionalSavedState });
 * const view = BlockPuzzle.mount({ canvas, mascot: optionalCanvas, game });
 * game.snapshot() → JSON 저장용 상태. game.revive() → 중앙 두 행 폭파.
 * game.setPaused(true/false), game.place(index, col, row), game.destroy().
 * view.react('correct'|'wrong'|'mission'), view.destroy().
 *
 * 이벤트: pick, place, lines, goal, no-moves, revive.
 * lines 이벤트 한 번에 rows, cols, cleared, count, streak, multiplier를 전달.
 * game의 onEvent는 이동 전체가 반영된 뒤 호출된다.
 */
(() => {
  'use strict';

  const SIZE = 8;
  const PALETTE = ['#58c9e8', '#a491ff', '#ed83b9', '#f8c66a', '#7bdba3', '#f99c80'];
  const SHAPES = [
    ['#'], ['##'], ['###'], ['####'], ['#####'],
    ['#','#'], ['#','#','#'], ['#','#','#','#'],
    ['##','##'], ['###','###'], ['##','##','##'], ['###','###','###'],
    ['#.', '##'], ['.#','##'], ['##','#.'], ['##','.#'],
    ['#..','###'], ['..#','###'], ['###','.#.'], ['.#.','###'],
    ['.##','##.'], ['##.','.##'], ['#..','#..','###']
  ].map((rows, id) => Object.freeze({
    id, width: rows[0].length, height: rows.length,
    cells: Object.freeze(rows.flatMap((row, y) => [...row].flatMap((cell, x) =>
      cell === '#' ? [Object.freeze([x, y])] : [])))
  }));
  Object.freeze(SHAPES);

  function goalFor(level) {
    const lines = 2 + Math.floor(Math.max(0, level - 3) / 6);
    return { lines, score: 180 + lines * 100 + Math.max(0, level - 3) * 12 };
  }

  function seedFor(corner, level) {
    let seed = 2166136261;
    for (const char of String(corner) + ':' + level) {
      seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
    }
    return (seed >>> 0) || 1;
  }

  function accepts(board, shape, x, y) {
    return Number.isInteger(x) && Number.isInteger(y) &&
      x >= 0 && y >= 0 && x + shape.width <= SIZE && y + shape.height <= SIZE &&
      shape.cells.every(([dx, dy]) => board[y + dy][x + dx] === 0);
  }

  function fitsAnywhere(board, shape) {
    for (let y = 0; y <= SIZE - shape.height; y++) {
      for (let x = 0; x <= SIZE - shape.width; x++) {
        if (accepts(board, shape, x, y)) return true;
      }
    }
    return false;
  }

  function completed(board) {
    const rows = [];
    const cols = [];
    for (let index = 0; index < SIZE; index++) {
      if (board[index].every(Boolean)) rows.push(index);
      if (board.every(row => row[index])) cols.push(index);
    }
    return { rows, cols };
  }

  function erase(board, rows, cols) {
    const cells = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[y][x] && (rows.includes(y) || cols.includes(x))) {
          cells.push({ x, y, color: board[y][x] });
          board[y][x] = 0;
        }
      }
    }
    return cells;
  }

  function numberIn(value, min, max) {
    return Number.isSafeInteger(value) && value >= min && value <= max;
  }

  function createGame({ corner, level, bestScore = 0, snapshot: saved, onEvent = () => {} }) {
    if (!numberIn(level, 1, 50)) throw new RangeError('Invalid puzzle level');
    const goal = goalFor(level);
    const listeners = new Set([onEvent]);
    let randomState = seedFor(corner, level);
    let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    let tray = [];
    let lines = 0;
    let score = 0;
    let streak = 0;
    let peakCombo = 0;
    let bombs = 0;
    let best = Number.isSafeInteger(bestScore) ? Math.max(0, bestScore) : 0;
    let announcedBest = false;
    let status = 'playing';
    let paused = false;
    let destroyed = false;

    function random() {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      randomState >>>= 0;
      return randomState / 4294967296;
    }

    function pick(items) {
      return items[Math.floor(random() * items.length)];
    }

    function drawPiece(ids) {
      return { shape: pick(ids), color: 1 + Math.floor(random() * PALETTE.length) };
    }

    function deal(rescue = false) {
      if (rescue) return [[3], [3], [2, 3]].map(drawPiece);
      if (level <= 3) return [[3], [3], [1, 2, 5, 8, 12]].map(drawPiece);
      const ids = SHAPES.slice(1, level < 12 ? 16 : SHAPES.length).map(shape => shape.id);
      return [drawPiece(ids), drawPiece(ids), drawPiece(level < 8 ? [0, 1, 2, 5, 12] : ids)];
    }

    function seedBoard() {
      const amount = Math.min(20, Math.max(0, Math.ceil((level - 3) * 0.48)));
      const positions = Array.from({ length: SIZE * SIZE }, (_, i) => i);
      let placed = 0;
      while (placed < amount && positions.length) {
        const index = positions.splice(Math.floor(random() * positions.length), 1)[0];
        const y = Math.floor(index / SIZE);
        const x = index % SIZE;
        board[y][x] = Math.floor(random() * PALETTE.length) + 1;
        const { rows, cols } = completed(board);
        if (rows.length || cols.length) board[y][x] = 0;
        else placed++;
      }
    }

    function restore(previous) {
      if (!previous || previous.version !== 1 || previous.corner !== corner || previous.level !== level ||
          !numberIn(previous.randomState, 1, 0xffffffff) ||
          !Array.isArray(previous.board) || previous.board.length !== SIZE ||
          !previous.board.every(row => Array.isArray(row) && row.length === SIZE && row.every(color => numberIn(color, 0, PALETTE.length))) ||
          !Array.isArray(previous.tray) || previous.tray.length !== 3 ||
          !previous.tray.some(Boolean) ||
          !previous.tray.every(piece => piece === null || (piece && numberIn(piece.shape, 0, SHAPES.length - 1) && numberIn(piece.color, 1, PALETTE.length))) ||
          ![previous.lines, previous.score, previous.streak].every(value => numberIn(value, 0, Number.MAX_SAFE_INTEGER)) ||
          !['playing', 'goal', 'no-moves'].includes(previous.status)) return false;
      board = previous.board.map(row => [...row]);
      tray = previous.tray.map(piece => piece && { ...piece });
      ({ lines, score, streak, status, randomState } = previous);
      bombs = numberIn(previous.bombs, 0, 3) ? previous.bombs : 0;
      peakCombo = Math.max(streak, numberIn(previous.peakCombo, 0, Number.MAX_SAFE_INTEGER) ? previous.peakCombo : 0);
      best = Math.max(best, score, numberIn(previous.best, 0, Number.MAX_SAFE_INTEGER) ? previous.best : 0);
      announcedBest = previous.announcedBest === true;
      return true;
    }

    if (!restore(saved)) {
      seedBoard();
      tray = deal();
      if (!tray.some(piece => fitsAnywhere(board, SHAPES[piece.shape]))) tray[2] = drawPiece([0]);
    }

    function snapshot() {
      return {
        version: 1, corner, level, board: board.map(row => [...row]),
        tray: tray.map(piece => piece && { ...piece }), lines, score, streak, status, randomState, bombs, peakCombo, best, announcedBest
      };
    }

    function state() { return { ...snapshot(), goal: { ...goal }, paused }; }

    function emit(event) {
      if (!listeners.size) return;
      const current = state();
      for (const listener of [...listeners]) listener(event, current);
    }

    function subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function canPlay() { return !destroyed && !paused && status === 'playing'; }

    function canPlace(index, x, y) {
      const piece = tray[index];
      return canPlay() && !!piece && accepts(board, SHAPES[piece.shape], x, y);
    }

    function notifyPick(index) {
      if (canPlay() && tray[index]) emit({ type: 'pick', index });
    }

    function assess() {
      if (lines >= goal.lines && score >= goal.score) status = 'goal';
      else if (!bombs && !tray.some(item => item && fitsAnywhere(board, SHAPES[item.shape]))) status = 'no-moves';
    }

    function updateBest() {
      if (score <= best) return false;
      best = score;
      if (announcedBest) return false;
      announcedBest = true;
      return true;
    }

    function blastCells(x, y) {
      if (!game.canPlay() || !bombs || !numberIn(x, 0, 7) || !numberIn(y, 0, 7)) return [];
      const cells = [];
      for (let row = Math.max(0, y - 1); row <= Math.min(7, y + 1); row++) {
        for (let col = Math.max(0, x - 1); col <= Math.min(7, x + 1); col++) {
          cells.push({ x: col, y: row, color: board[row][col] });
        }
      }
      return cells;
    }

    function useBomb(x, y) {
      const area = blastCells(x, y);
      const cleared = area.filter(cell => cell.color);
      if (!cleared.length) return false;
      for (const cell of cleared) board[cell.y][cell.x] = 0;
      bombs--;
      streak = 0;
      score += cleared.length * 15;
      const newBest = updateBest();
      assess();
      emit({ type: 'bomb', area, cleared });
      if (newBest) emit({ type: 'new-best' });
      if (status !== 'playing') emit({ type: status });
      return true;
    }

    function place(index, x, y) {
      if (!canPlace(index, x, y)) return false;
      const piece = tray[index];
      const placed = SHAPES[piece.shape].cells.map(([dx, dy]) => ({
        x: x + dx, y: y + dy, color: piece.color
      }));
      for (const cell of placed) board[cell.y][cell.x] = cell.color;
      tray[index] = null;
      score += placed.length * 10;
      const full = completed(board);
      const count = full.rows.length + full.cols.length;
      let cleared = [];
      let multiplier = 1;
      let gift = false;
      if (count) {
        streak++;
        peakCombo = Math.max(peakCombo, streak);
        multiplier = 2 ** Math.min(10, streak - 1);
        if ((count >= 2 || streak === 3) && bombs < 3) {
          bombs++;
          gift = true;
        }
        score += 100 * count * multiplier + 50 * (count - 1);
        lines += count;
        cleared = erase(board, full.rows, full.cols);
      } else {
        streak = 0;
      }
      if (!tray.some(Boolean)) tray = deal();
      const newBest = updateBest();
      assess();
      emit({ type: 'place', index, placed });
      if (count) emit({ type: 'lines', ...full, count, cleared, streak, multiplier, gift });
      if (newBest) emit({ type: 'new-best' });
      if (status !== 'playing') emit({ type: status });
      return true;
    }

    function revive() {
      if (destroyed || status === 'playing') return false;
      const cleared = erase(board, [3, 4], []);
      tray = deal(true);
      streak = 0;
      paused = false;
      status = 'playing';
      emit({ type: 'revive', rows: [3, 4], cleared });
      return true;
    }

    function setPaused(value) { paused = Boolean(value); }

    function destroy() {
      destroyed = true;
      listeners.clear();
    }

    const game = Object.freeze({ state, snapshot, subscribe, canPlay, canPlace, notifyPick,
      place, blastCells, useBomb, revive, signalInvalid: () => emit({ type: 'invalid' }), setPaused, destroy });
    return game;
  }

  const MOA = [
    '......OO........', '.....OLLO.OO....', '......OLLOLO....', '.......OLOO.....',
    '....OOOMMOOO.Y..', '...OMLMMMMMMYY..', '..OMMMMMMMMMYMO.',
    '..OMWOKMMKOWMMO.', '..OMPOKMMKOPMCOR', '.OOMMMMMMMMMCHO.',
    '.OTOMMMKKMMMCHOR', '.OTPOMMMMMMCCHOR', '.OGGOMMMMMMCCRO.',
    '..OGOOMMMMMMOO..', '...OMMOOOOOMMO..', '....OO.....OO...'
  ];
  const INK = { O:'#315846', M:'#99dfae', L:'#d2f3bc', K:'#26313a', W:'#fffef7',
    P:'#f3a794', Y:'#ffe274', C:'#fff0ce', H:'#ddc18f', R:'#f6775e', T:'#669a92', G:'#95bdc6' };

  function drawMoa(context, time, mood = 'idle', reduced = false, flip = 0, turns = 1) {
    const phase = reduced ? 0 : time / 135;
    const jump = flip > 0 && !reduced ? Math.sin(flip * Math.PI) * 12 : 0;
    const dance = mood === 'correct' ? Math.sin(phase) * 0.18 : 0;
    const tilt = mood === 'wrong' && !reduced ? 0.15 : 0;
    const blink = !reduced && time % 3500 > 3350;
    context.save();
    context.translate(36, 37 - jump + Math.sin(phase * 0.33));
    context.rotate(flip * Math.PI * 2 * turns + dance + tilt);
    MOA.forEach((row, y) => [...row].forEach((ink, x) => {
      if (!INK[ink]) return;
      context.fillStyle = blink && (y === 7 || y === 8) && 'WK'.includes(ink) ? INK.M : INK[ink];
      context.fillRect((x - 8) * 3, (y - 8) * 3, 3, 3);
    }));
    context.restore();
    if (mood === 'cheer' || mood === 'correct' || mood === 'wrong') {
      context.fillStyle = mood === 'wrong' ? INK.P : INK.Y;
      context.fillRect(60, 6, 3, 11);
      context.fillRect(56, 10, 11, 3);
    }
  }

  function mount({ canvas, mascot, game }) {
    const context = canvas.getContext('2d');
    const mascotContext = mascot?.getContext('2d');
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const originalTouch = canvas.style.touchAction;
    const originalOverscroll = canvas.style.overscrollBehavior;
    canvas.style.touchAction = 'none';
    canvas.style.overscrollBehavior = 'contain';
    let state = game.state();
    let geometry;
    let drag;
    let returning;
    let frame;
    let previousTime = 0;
    let shakeUntil = 0;
    let mood = 'idle';
    let moodUntil = 0;
    let flipStart = 0;
    let flipTurns = 1;
    let bombArmed = false;
    let bombTarget = null;
    const particles = [];
    const captions = [];
    const pops = new Map();
    const listeners = new AbortController();
    const opts = { signal: listeners.signal };

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width;
      const height = bounds.height;
      if (!width || !height) return;
      const dpr = Math.min(2.5, globalThis.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
      const cell = Math.max(1, Math.min((width - 16) / SIZE, (height - 105) / SIZE));
      geometry = { width, height, cell, x: (width - cell * SIZE) / 2, y: 6, trayY: cell * SIZE + 14 };
      if (drag) updateDrag(drag.clientX, drag.clientY);
    }

    function trayBox(index) {
      const boardWidth = geometry.cell * SIZE;
      const width = (boardWidth - 12) / 3;
      return { x: geometry.x + index * (width + 6), y: geometry.trayY,
        width, height: Math.max(44, geometry.height - geometry.trayY - 4) };
    }

    function trayPose(index, shape) {
      const box = trayBox(index);
      const cell = Math.min(geometry.cell * 0.52, (box.width - 8) / 5, (box.height - 8) / 4);
      return { cell, x: box.x + (box.width - shape.width * cell) / 2,
        y: box.y + (box.height - shape.height * cell) / 2 };
    }

    function tile(x, y, size, color, opacity = 1, scale = 1) {
      const pad = (1 - scale) * size / 2;
      x += pad + 1;
      y += pad + 1;
      const edge = Math.max(2, size * scale - 2);
      context.globalAlpha = opacity;
      context.fillStyle = color;
      context.fillRect(x, y, edge, edge);
      context.fillStyle = '#ffffff4d';
      context.fillRect(x + 2, y + 2, edge - 4, 2);
      context.fillRect(x + 2, y + 4, 2, Math.max(0, edge - 8));
      context.fillStyle = '#18283e4d';
      context.fillRect(x + 2, y + edge - 4, edge - 4, 2);
      context.fillRect(x + edge - 4, y + 4, 2, Math.max(0, edge - 8));
      if (edge > 12) {
        context.fillStyle = '#fff9';
        context.fillRect(x + edge - 8, y + 5, 1, 1);
      }
      context.globalAlpha = 1;
    }

    function paintPiece(piece, pose, color = PALETTE[piece.color - 1], opacity = 1) {
      for (const [x, y] of SHAPES[piece.shape].cells) {
        tile(pose.x + x * pose.cell, pose.y + y * pose.cell, pose.cell, color, opacity);
      }
    }

    function local(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function updateDrag(clientX, clientY) {
      if (!drag || !geometry) return;
      Object.assign(drag, { clientX, clientY });
      const point = local(clientX, clientY);
      const { cell, x, y } = geometry;
      const shape = SHAPES[drag.piece.shape];
      const left = point.x - drag.anchorX * cell;
      const top = point.y - drag.lift - drag.anchorY * cell;
      const rawCol = (left - x) / cell;
      const rawRow = (top - y) / cell;
      const col = Math.max(0, Math.min(SIZE - shape.width, Math.round(rawCol)));
      const row = Math.max(0, Math.min(SIZE - shape.height, Math.round(rawRow)));
      const near = Math.abs(rawCol - col) <= 0.7 && Math.abs(rawRow - row) <= 0.7;
      drag.pose = { x: left, y: top, cell };
      drag.target = near ? { col, row, ok: game.canPlace(drag.index, col, row) } : null;
    }

    function pointerDown(event) {
      if (drag || !geometry || !game.canPlay() || event.button !== 0 || !event.isPrimary) return;
      const point = local(event.clientX, event.clientY);
      if (bombArmed) {
        event.preventDefault();
        aimBomb(point);
        if (bombTarget && game.useBomb(bombTarget.x, bombTarget.y)) armBomb(false);
        else game.signalInvalid();
        return;
      }
      const index = state.tray.findIndex((piece, i) => {
        if (!piece) return false;
        const box = trayBox(i);
        return point.x >= box.x && point.x <= box.x + box.width &&
          point.y >= box.y && point.y <= box.y + box.height;
      });
      if (index < 0) return;
      event.preventDefault();
      const piece = state.tray[index];
      const shape = SHAPES[piece.shape];
      const preview = trayPose(index, shape);
      const anchored = (value, max) => Math.max(0.15, Math.min(max - 0.15, value));
      const mouse = event.pointerType === 'mouse';
      drag = {
        index, piece, id: event.pointerId, lift: mouse ? 0 : 60,
        anchorX: mouse ? anchored((point.x - preview.x) / preview.cell, shape.width) : shape.width / 2,
        anchorY: mouse ? anchored((point.y - preview.y) / preview.cell, shape.height) : shape.height / 2
      };
      returning = null;
      canvas.setPointerCapture(event.pointerId);
      updateDrag(event.clientX, event.clientY);
      game.notifyPick(index);
    }

    function armBomb(value = true) {
      bombArmed = Boolean(value && state.bombs && game.canPlay() && !drag);
      if (!bombArmed) bombTarget = null;
      return bombArmed;
    }

    function aimBomb(point) {
      const x = Math.floor((point.x - geometry.x) / geometry.cell);
      const y = Math.floor((point.y - geometry.y) / geometry.cell);
      bombTarget = x >= 0 && x < SIZE && y >= 0 && y < SIZE ? { x, y } : null;
    }

    function pointerMove(event) {
      if (bombArmed && event.isPrimary) aimBomb(local(event.clientX, event.clientY));
      if (drag?.id !== event.pointerId) return;
      event.preventDefault();
      updateDrag(event.clientX, event.clientY);
    }

    function pointerEnd(event) {
      if (drag?.id !== event.pointerId) return;
      const dropped = event.type === 'pointerup';
      if (dropped) updateDrag(event.clientX, event.clientY);
      const item = drag;
      drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (dropped && item.target?.ok && game.place(item.index, item.target.col, item.target.row)) return;
      if (dropped) game.signalInvalid();
      if (!reduced) returning = { ...item, started: performance.now() };
    }

    function burst(cell, now, power) {
      const count = reduced ? 3 : 8 + Math.floor(Math.random() * 7);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const force = (0.9 + Math.random() * 2.7) * power;
        particles.push({
          x: cell.x + 0.5, y: cell.y + 0.5, vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force - 1.3, size: 2 + Math.random() * 4,
          color: PALETTE[cell.color - 1] || '#ffe393', expires: now + 330 + Math.random() * 280
        });
      }
    }

    function react(next) {
      mood = next;
      moodUntil = next === 'mission' ? Infinity : performance.now() + 1100;
    }

    const unsubscribe = game.subscribe((event, next) => {
      state = next;
      const now = performance.now();
      if (event.type === 'place') {
        for (const cell of event.placed) pops.set(cell.y * SIZE + cell.x, now + 180);
      }
      if (event.type === 'new-best' || event.type === 'bomb') {
        if (event.type === 'bomb') {
          shakeUntil = now + 260;
          for (const cell of event.area) burst(cell, now, 2.5);
        }
        captions.push({ label: event.type === 'bomb' ? '슈웅–펑!' : 'NEW BEST!', index: captions.length, started: now });
      }
      if (event.type === 'lines' || event.type === 'revive') {
        const revival = event.type === 'revive';
        if (revival || event.count >= 2) shakeUntil = now + 220;
        const effects = revival ? [3, 4].flatMap(y => Array.from({ length: SIZE }, (_, x) => (
          event.cleared.find(cell => cell.x === x && cell.y === y) || { x, y, color: (x + y) % PALETTE.length + 1 }
        ))) : event.cleared;
        for (const cell of effects) burst(cell, now, revival || event.count >= 2 ? 1.5 : 1);
        const praise = ['','', 'GREAT!', 'AMAZING!'][event.count] || (event.count >= 4 ? 'UNBELIEVABLE!' : '');
        const labels = revival ? ['부활!'] : [
          '분개하기!', praise, event.gift ? '선물 폭탄!' : '', event.streak > 1 ? 'COMBO x' + event.multiplier + '!' : ''
        ].filter(Boolean);
        captions.length = 0;
        labels.forEach((label, index) => captions.push({ label, index, started: now }));
        react('cheer');
        flipStart = now;
        flipTurns = Math.min(3, event.streak || 1);
      }
    });

    function paintEffects(now, dt) {
      const { x, y, cell } = geometry;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.expires <= now) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.16 ** dt;
        p.vy += 7.2 * dt;
        context.fillStyle = p.color;
        context.globalAlpha = Math.min(1, (p.expires - now) / 180);
        context.fillRect(x + p.x * cell, y + p.y * cell, p.size, p.size);
      }
      context.globalAlpha = 1;
      for (let i = captions.length - 1; i >= 0; i--) {
        const caption = captions[i];
        const age = now - caption.started;
        if (age > 850) {
          captions.splice(i, 1);
          continue;
        }
        const scale = reduced ? 1 : 1 + Math.sin(Math.min(1, age / 280) * Math.PI) * 0.19;
        const baseline = y + cell * (2.7 + caption.index * 0.8) - (reduced ? 0 : age / 85);
        context.font = 'bold ' + Math.round(Math.min(cell * 0.68, 30) * scale) + 'px Galmuri11, monospace';
        context.textAlign = 'center';
        context.lineJoin = 'round';
        context.lineWidth = 6;
        context.strokeStyle = '#9a355d';
        context.fillStyle = '#ffe48a';
        context.globalAlpha = Math.min(1, (850 - age) / 220);
        context.strokeText(caption.label, geometry.width / 2, baseline);
        context.fillText(caption.label, geometry.width / 2, baseline);
      }
      context.globalAlpha = 1;
    }

    function draw(now) {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(0.033, (now - previousTime) / 1000);
      previousTime = now;
      if (!geometry) return;
      const { x, y, cell, width, height } = geometry;
      context.clearRect(0, 0, width, height);
      context.save();
      if (!reduced && now < shakeUntil) {
        const strength = (shakeUntil - now) / 220 * 4;
        context.translate(Math.cos(now * 0.16) * strength, Math.sin(now * 0.2) * strength / 2);
      }
      context.fillStyle = '#101a30';
      context.fillRect(x - 3, y - 3, SIZE * cell + 6, SIZE * cell + 6);
      state.board.forEach((row, r) => row.forEach((color, c) => {
        const left = x + c * cell;
        const top = y + r * cell;
        context.fillStyle = (r + c) % 2 ? '#202c48' : '#24324f';
        context.fillRect(left + 1, top + 1, cell - 2, cell - 2);
        const key = r * SIZE + c;
        const pop = pops.get(key) || 0;
        if (pop <= now) pops.delete(key);
        const scale = !reduced && pop > now ? 1 + Math.sin((pop - now) / 180 * Math.PI) * 0.13 : 1;
        if (color) tile(left, top, cell, PALETTE[color - 1], 1, scale);
      }));
      if (drag?.target && game.canPlay()) {
        const { col, row, ok } = drag.target;
        paintPiece(drag.piece, { x: x + col * cell, y: y + row * cell, cell },
          ok ? '#63ee9d' : '#ff687e', ok ? 0.52 + 0.13 * Math.sin(now / 95) : 0.64);
      }
      if (bombArmed && bombTarget) {
        const area = game.blastCells(bombTarget.x, bombTarget.y);
        for (const square of area) tile(x + square.x * cell, y + square.y * cell, cell,
          area.some(target => target.color) ? '#ffc575' : '#ff7585', 0.68);
      }
      paintEffects(now, dt);
      context.restore();

      state.tray.forEach((piece, index) => {
        const box = trayBox(index);
        context.fillStyle = '#202b44';
        context.fillRect(box.x, box.y, box.width, box.height);
        if (piece && drag?.index !== index && returning?.index !== index) {
          paintPiece(piece, trayPose(index, SHAPES[piece.shape]));
        }
      });
      if (returning) {
        const progress = Math.min(1, (now - returning.started) / 180);
        const end = trayPose(returning.index, SHAPES[returning.piece.shape]);
        const ease = 1 - (1 - progress) ** 3;
        const pose = Object.fromEntries(['x', 'y', 'cell'].map(key =>
          [key, returning.pose[key] + (end[key] - returning.pose[key]) * ease]));
        paintPiece(returning.piece, pose);
        if (progress === 1) returning = null;
      }
      if (drag?.pose && game.canPlay()) paintPiece(drag.piece, drag.pose, undefined, drag.target?.ok ? 0.7 : 0.95);
      if (mascotContext) {
        mascotContext.clearRect(0, 0, 72, 72);
        const elapsed = now - flipStart;
        const flight = 360 + (flipTurns - 1) * 120;
        const flip = !reduced && flipStart && elapsed < flight ? elapsed / flight : 0;
        drawMoa(mascotContext, now, now < moodUntil ? mood : 'idle', reduced, flip, flipTurns);
      }
    }

    const observer = globalThis.ResizeObserver ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    globalThis.addEventListener('resize', resize, opts);
    canvas.addEventListener('pointerdown', pointerDown, opts);
    canvas.addEventListener('pointermove', pointerMove, opts);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, pointerEnd, opts);
    canvas.addEventListener('contextmenu', event => event.preventDefault(), opts);
    for (const event of ['gesturestart', 'gesturechange']) {
      canvas.addEventListener(event, gesture => gesture.preventDefault(), { ...opts, passive: false });
    }
    if (mascot) {
      mascot.width = 72;
      mascot.height = 72;
      mascotContext.imageSmoothingEnabled = false;
    }
    resize();
    frame = requestAnimationFrame(draw);

    function destroy() {
      listeners.abort();
      observer?.disconnect();
      unsubscribe();
      cancelAnimationFrame(frame);
      if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
      canvas.style.touchAction = originalTouch;
      canvas.style.overscrollBehavior = originalOverscroll;
    }

    return Object.freeze({ react, resize, armBomb, destroy });
  }

  const api = Object.freeze({ SIZE, shapes: SHAPES, goalFor, fitsAnywhere, createGame, mount, drawMoa });
  globalThis.BlockPuzzle = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
