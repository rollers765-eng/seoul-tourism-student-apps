/* PART B · data.js → engine.js → board-config.js → app.js 순서로 defer 로드.
 * 필요한 HTML: <main id="app"></main>. 플레이·메뉴·모달은 여기서 생성합니다.
 */
(() => {
  'use strict';
  const root = document.querySelector('#app');
  if (!root) return;
  const D = window.BlasterData;
  const E = window.BlockPuzzle;
  if (!D || !E) {
    root.textContent = 'data.js와 engine.js를 불러오지 못했어요.';
    return;
  }
  const all = Object.values(D.STAGES).flat();
  const byId = new Map(all.map(p => [p.id, p]));
  const key = 'blaster.v2';
  const format = n => Number(n).toLocaleString('ko-KR');
  const clean = value => String(value ?? '').trim().normalize('NFC').replace(/\s+/g, ' ');
  const nicknameOk = value => [...value].length >= 2 && [...value].length <= 10 &&
    /^[\p{L}\p{N}_ -]+$/u.test(value);
  const fresh = () => ({
    version: 2, levels: {}, nickname: '', profiles: {}, gems: 0, run: null,
    settings: { muted: true, effects: true, music: true, speech: true }
  });

  function read(which) {
    try { return JSON.parse(localStorage.getItem(which)); } catch { return null; }
  }

  function load() {
    const current = read(key);
    if (current?.version === 2) return { ...fresh(), ...current, settings: { ...fresh().settings, ...current.settings } };
    const state = fresh();
    const old = read('blaster.v1');
    for (const corner of D.CORNERS) {
      const track = old?.progress?.[corner.key];
      if (!track) continue;
      for (let stage = 1; stage <= Math.min(corner.stages, Number(track.cleared) || 0); stage++) {
        const p = D.STAGES[corner.key][stage - 1];
        state.levels[p.id] = { clear: true, stars: Math.max(1, Math.min(3, Number(track.stars?.[stage]) || 1)),
          best: 0, combo: 0 };
      }
    }
    return state;
  }

  let store = load();
  let saveFailed = false;
  let game;
  let view;
  let route;
  let generation = 0;
  let transition = 0;
  let hud;
  let modal;
  let run;
  let audio;
  let audioButton;

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(store));
      saveFailed = false;
    } catch { saveFailed = true; }
  }
  save();

  function el(tag, cls = '', text = '') {
    const item = document.createElement(tag);
    if (cls) item.className = cls;
    if (text) item.textContent = text;
    return item;
  }

  function button(label, callback, cls = '') {
    const node = el('button', cls, label);
    node.type = 'button';
    node.addEventListener('click', event => {
      void audio.unlock();
      audio.play('tap');
      callback(event);
    });
    return node;
  }

  function levelRecord(p) {
    return store.levels[p.id] ??= { stars: 0, best: 0, combo: 0 };
  }

  function unlocked(p) {
    return p.stage === 1 || store.levels[D.STAGES[p.corner][p.stage - 2].id]?.clear === true;
  }

  function totals() {
    const items = Object.values(store.levels);
    return {
      best_score: Math.max(0, ...items.map(r => r.best || 0)),
      cleared_stages: items.filter(r => r.clear).length,
      best_combo: Math.max(0, ...items.map(r => r.combo || 0)),
      stars: items.reduce((sum, r) => sum + (r.stars || 0), 0),
      notes: items.filter(r => r.note).length
    };
  }

  function profile() {
    const { best_score, cleared_stages, best_combo } = totals();
    return { nickname: store.nickname, best_score, cleared_stages, best_combo };
  }

  function updateProfile() {
    if (!store.nickname) return;
    const list = new Map(Object.values(store.profiles).map(row => [row.nickname, row]));
    list.set(store.nickname, profile());
    store.profiles = Object.fromEntries([...list].slice(-30));
  }

  function createAudio() {
    let ctx;
    let bus;
    let timer;
    let musicIndex = 0;
    const active = () => ctx?.state === 'running' && !store.settings.muted && !document.hidden;
    const melody = [523, 659, 784, 659, 587, 698, 880, 698, 659, 784, 988, 784, 587, 698, 784, 0];

    async function unlock() {
      if (store.settings.muted || document.hidden) return;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        if (!ctx) {
          ctx = new Audio();
          bus = ctx.createGain();
          bus.gain.value = 0.55;
          bus.connect(ctx.destination);
        }
        if (ctx.state !== 'running') await ctx.resume();
        sync();
      } catch { /* 소리를 재생할 수 없으면 화면으로 피드백을 전달 */ }
    }

    function tone(freq, offset, duration, type = 'triangle', end = freq, volume = 0.10) {
      const time = ctx.currentTime + offset;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, time);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, end), time + duration);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain).connect(bus);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(time);
      oscillator.stop(time + duration);
    }

    function noise(offset, duration) {
      const time = ctx.currentTime + offset;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, time);
      filter.frequency.exponentialRampToValueAtTime(130, time + duration);
      gain.gain.setValueAtTime(0.23, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      source.connect(filter).connect(gain).connect(bus);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(time);
    }

    function arp(root, notes, offset = 0, step = 0.061) {
      notes.forEach((semitones, index) => {
        const pitch = root * 2 ** (semitones / 12);
        tone(pitch, offset + index * step, 0.17, 'triangle', pitch * 1.015, 0.15);
        tone(pitch * 2, offset + index * step, 0.085, 'square', pitch * 2, 0.024);
      });
    }

    function speak() {
      if (store.settings.muted || !store.settings.speech || document.hidden ||
          !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
      const voice = speechSynthesis.getVoices().find(item => /^ko(?:[-_]|$)/i.test(item.lang));
      if (!voice) return false;
      try {
        const words = new SpeechSynthesisUtterance('분개하기!');
        words.voice = voice;
        words.lang = 'ko-KR';
        words.rate = 1.16;
        words.volume = 0.55;
        words.onerror = () => play('speech-fallback');
        speechSynthesis.cancel();
        speechSynthesis.speak(words);
        return true;
      } catch { return false; }
    }

    function play(type, event = {}) {
      const spoken = type === 'lines' && speak();
      if (!active() || !store.settings.effects) return;
      switch (type) {
        case 'tap': tone(480, 0, .045, 'triangle', 340, .06); break;
        case 'pick': tone(285, 0, .11, 'triangle', 790); break;
        case 'place': tone(240, 0, .078, 'triangle', 92); break;
        case 'invalid': tone(310, 0, .14, 'sine', 125); break;
        case 'lines': {
          const pitch = 330 * 2 ** (Math.min(7, (event.streak || 1) - 1) / 12);
          const count = event.count || 1;
          arp(pitch, count >= 3 ? [0, 4, 7, 12, 16, 19] : count === 2 ? [0, 7, 12, 16] : [0, 4, 7]);
          tone(260, .12, .14, 'sine', 880, .075); // 공중제비
          tone(1175, .24, .17, 'triangle', 1397, .075);
          if (count > 1) {
            [0, 4, 7].forEach(n => tone(pitch * 2 ** (n / 12), .16, .19, 'triangle', pitch * 2 ** (n / 12), .045));
            noise(.12, .13);
          }
          if (!spoken) arp(523, [0, 7, 12], .23, .043);
          break;
        }
        case 'speech-fallback': arp(523, [0, 7, 12], 0, .043); break;
        case 'bomb':
        case 'revive':
          tone(168, 0, .22, 'sawtooth', 850, .065);
          tone(108, .16, .27, 'sine', 34, .23);
          noise(.17, .26);
          arp(294, [0, 7, 12], .23);
          break;
        case 'correct': arp(494, [0, 4, 7, 12, 16]); break;
        case 'wrong': tone(360, 0, .16, 'sine', 310); tone(260, .12, .21, 'sine', 190); break;
        case 'clear': arp(392, [0, 4, 7, 12, 7, 12, 16, 19]); break;
        case 'new-best': arp(440, [0, 7, 12], .08, .052); break;
      }
    }

    function sync() {
      if (bus) bus.gain.value = active() ? 0.55 : 0;
      if (store.settings.muted || document.hidden) window.speechSynthesis?.cancel();
      const playing = active() && store.settings.music && route?.name === 'play' && !modal;
      if (!playing) { clearInterval(timer); timer = undefined; return; }
      if (timer !== undefined) return;
      timer = setInterval(() => {
        const n = musicIndex++ % melody.length;
        if (melody[n]) tone(melody[n], 0, .14, 'triangle', melody[n], .052);
        if (n % 4 === 0) tone(melody[n] / 4, 0, .21, 'sine', melody[n] / 4, .044);
      }, 192);
    }

    return { unlock, play, sync };
  }

  audio = createAudio();
  document.addEventListener('visibilitychange', audio.sync);
  document.addEventListener('pointerdown', () => { void audio.unlock(); }, { passive: true });

  const routes = { home, stages, play, notes, codex, report, settings, scoreboard };
  function show(name, params = {}) {
    generation++;
    clearTimeout(transition);
    view?.destroy();
    game?.destroy();
    view = game = modal = hud = null;
    route = { ...params, name };
    root.replaceChildren();
    root.dataset.screen = name;
    const top = el('header', 'app-bar');
    if (name !== 'home') top.append(button('← 뒤로', () => goBack()));
    top.append(el('span', 'brand', '자산모아'));
    audioButton = button(store.settings.muted ? '소리 켜기' : '음소거', () => {
      store.settings.muted = !store.settings.muted;
      audioButton.textContent = store.settings.muted ? '소리 켜기' : '음소거';
      audioButton.setAttribute('aria-pressed', String(!store.settings.muted));
      save();
      void audio.unlock();
      audio.sync();
    }, 'audio-toggle');
    audioButton.setAttribute('aria-pressed', String(!store.settings.muted));
    top.append(audioButton);
    root.append(top);
    routes[name]();
    audio.sync();
    window.scrollTo(0, 0);
  }

  function goBack() {
    if (route.name === 'play') show('stages', { corner: route.problem.corner });
    else if (route.back) show(route.back.name, route.back);
    else show('home');
  }

  function heading(title, subtitle = '') {
    const area = el('section', 'heading');
    area.append(el('h1', '', title));
    if (subtitle) area.append(el('p', 'muted', subtitle));
    root.append(area);
  }

  function examDay() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date());
    const date = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
    const gap = (Date.UTC(2026, 10, 30) - Date.UTC(date.year, date.month - 1, date.day)) / 86400000;
    return gap > 0 ? 'D−' + gap : gap === 0 ? 'D-DAY' : '평가일 11.30';
  }

  function nicknameForm() {
    const form = el('form', 'nickname-form panel');
    const label = el('label', '', '별명 2~10자 (실명 대신)');
    const input = el('input');
    input.name = 'nickname';
    input.autocomplete = 'off';
    input.maxLength = 20;
    input.value = store.nickname;
    label.append(input);
    const submit = el('button', 'primary', '별명 저장');
    submit.type = 'submit';
    const error = el('p', 'warning');
    error.setAttribute('role', 'status');
    form.append(label, submit, error);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = clean(input.value);
      if (!nicknameOk(name)) {
        error.textContent = '한글·문자·숫자로 2~10자 별명을 입력해 주세요.';
        return;
      }
      store.nickname = name;
      updateProfile();
      save();
      show(route.name, route);
    });
    return form;
  }

  function meter(label, cls = '') {
    const bar = el('progress', 'meter ' + cls);
    bar.setAttribute('aria-label', label);
    bar.max = 1;
    bar.value = 0;
    return bar;
  }

  function home() {
    const hero = el('section', 'hero');
    hero.append(el('p', 'exam-ribbon', '3차 서술형 · ' + examDay()),
      el('h2', 'hero-title', '자산모아 블럭모아 Blaster'),
      el('p', '', '블록을 놓고 줄을 지워 회계 미션에 도전하세요.'));
    const startButton = button('게임 시작', () => {
      deck.scrollIntoView({ block: 'nearest' });
      deck.querySelector('button')?.focus({ preventScroll: true });
    }, 'primary');
    hero.append(startButton);
    root.append(hero);
    const stat = totals();
    root.append(el('p', 'summary', '★ ' + stat.stars + ' · 보석 ' + store.gems + ' · 오답 ' + stat.notes));
    if (!store.nickname) root.append(nicknameForm());
    else root.append(el('p', 'summary', store.nickname + '의 별명 챌린지'));
    const deck = el('section', 'corner-grid');
    for (const c of D.CORNERS) {
      const count = D.STAGES[c.key].filter(p => store.levels[p.id]?.clear).length;
      const tile = button(c.emoji + ' ' + c.name, () => show('stages', { corner: c.key }), 'corner');
      tile.style.setProperty('--accent', c.color);
      const bar = meter(c.name + ' 진행률');
      bar.max = c.stages;
      bar.value = count;
      tile.append(el('small', '', count + ' / ' + c.stages + ' 완료'), bar);
      deck.append(tile);
    }
    root.append(deck);
    const nav = el('nav', 'actions');
    for (const [name, label] of Object.entries({ notes: '오답 노트', codex: '계정과목 도감', report: '학습 리포트', scoreboard: '별명 점수판', settings: '설정' })) {
      nav.append(button(label, () => show(name)));
    }
    root.append(nav);
    if (saveFailed) root.append(el('p', 'warning', '이 브라우저는 기록 저장을 제한하고 있어요.'));
  }

  function stages() {
    const c = D.CORNERS.find(c => c.key === route.corner);
    heading(c.name, c.desc);
    const saved = byId.get(store.run?.id);
    if (saved?.corner === c.key) root.append(button(saved.stage + '단계 이어하기', () => start(saved, true), 'primary'));
    root.append(button('이 코너 오답만 다시 풀기', () => show('notes', { corner: c.key, back: route })));
    const deck = el('section', 'stage-grid');
    for (const p of D.STAGES[c.key]) {
      const rec = store.levels[p.id];
      const tile = button(p.stage + '단계', () => start(p), 'stage');
      tile.disabled = !unlocked(p);
      tile.append(el('small', '', tile.disabled ? '잠금' : rec?.clear ? '★'.repeat(rec.stars) : '도전'));
      if (D.EXAM[p.gen]) tile.append(el('span', 'badge', '3차 대비'));
      deck.append(tile);
    }
    root.append(deck);
  }

  function start(problem, resume = false) {
    if (!unlocked(problem)) return;
    run = resume && store.run?.id === problem.id ? store.run :
      { id: problem.id, misses: 0, revivals: 0, phase: 'playing' };
    show('play', { problem });
  }

  function persist(state = game.state()) {
    run.snapshot = game.snapshot();
    store.run = run;
    const record = levelRecord(route.problem);
    record.best = Math.max(record.best || 0, state.best);
    record.combo = Math.max(record.combo || 0, state.peakCombo);
    updateProfile();
    save();
  }

  function updateHud(state) {
    if (hud.scoreValue !== state.score) {
      if (state.score > (hud.scoreValue ?? state.score) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        hud.scorePop?.cancel();
        hud.scorePop = hud.score.animate([
          { transform: 'scale(1)', color: '#fff7cf' },
          { transform: 'scale(1.14)', color: '#a4ecc3', offset: .34 },
          { transform: 'scale(1)', color: '#fff7cf' }
        ], { duration: 240 });
      }
      hud.scoreValue = state.score;
      hud.score.textContent = format(state.score);
    }
    hud.best.textContent = 'BEST ' + format(state.best);
    hud.lines.label.textContent = '줄 ' + state.lines + ' / ' + state.goal.lines;
    hud.points.label.textContent = '점수 ' + format(state.score) + ' / ' + format(state.goal.score);
    for (const [group, value, max] of [[hud.lines, state.lines, state.goal.lines], [hud.points, state.score, state.goal.score]]) {
      group.bar.max = max;
      group.bar.value = Math.min(max, value);
    }
    hud.combo.textContent = '🔥 콤보 ' + state.streak;
    hud.bomb.textContent = '💣 선물 폭탄 ×' + state.bombs;
    hud.bomb.disabled = !state.bombs || state.status !== 'playing' || !!modal;
  }

  function openMission(phase) {
    clearTimeout(transition);
    run.phase = phase;
    persist();
    missionPanel(phase === 'revival' ? revivalProblem(route.problem) : route.problem, phase);
  }

  function play() {
    const p = route.problem;
    const stage = el('section', 'play-stage');
    const strip = el('div', 'play-hud');
    const character = el('div', 'moa-panel');
    const speech = el('span', 'moa-bubble', '차변부터 볼까?');
    const mascot = el('canvas', 'moa');
    mascot.setAttribute('aria-hidden', 'true');
    character.append(mascot, el('span', 'moa-name', '모아'), speech);
    const board = el('canvas', 'puzzle-canvas');
    board.setAttribute('aria-label', '8×8 퍼즐 보드와 조각 세 개. 아래 조각을 탭한 뒤 시작 칸을 탭하거나, 조각을 끌어 놓으세요.');
    const header = el('div', 'hud-info');
    header.append(el('h1', '', D.CORNERS.find(c => c.key === p.corner).name + ' ' + p.stage + '단계'));
    if (D.EXAM[p.gen]) header.append(el('span', 'badge', '3차 대비'));
    const scores = el('div', 'scores');
    function target(label, cls) {
      const node = el('div', 'target-meter');
      const title = el('span', 'target-label');
      const bar = meter(label, cls);
      node.append(title, bar);
      return { node, bar, label: title };
    }
    hud = { score: el('strong', 'score-value'), best: el('strong', 'best-value'),
      combo: el('span', 'combo-badge'), lines: target('목표 줄 진행률', 'mint-meter'),
      points: target('목표 점수 진행률', 'gold-meter') };
    const currentScore = el('div', 'score-current');
    currentScore.append(el('span', 'score-label', 'SCORE'), hud.score);
    const secondary = el('div', 'score-secondary');
    secondary.append(hud.best, hud.combo);
    scores.append(currentScore, secondary);
    header.append(scores, hud.lines.node, hud.points.node);
    strip.append(character, header);
    hud.bomb = button('선물 폭탄', () => {
      const isArmed = hud.bomb.getAttribute('aria-pressed') === 'true';
      const active = view.armBomb(!isArmed);
      hud.bomb.setAttribute('aria-pressed', String(active));
      hint.textContent = active ? '폭탄을 터뜨릴 보드의 칸을 탭하세요.' : '조각을 탭한 뒤 놓을 칸을 탭하거나 끌어 놓으세요.';
    }, 'bomb-button');
    hud.bomb.setAttribute('aria-pressed', 'false');
    const hint = el('p', 'play-hint', '조각을 탭한 뒤 놓을 칸을 탭하거나 끌어 놓으세요.');
    const foot = el('div', 'play-actions');
    foot.append(hud.bomb, hint);
    stage.append(strip, board, foot);
    root.append(stage);
    game = E.createGame({ corner: p.corner, level: p.stage, bestScore: levelRecord(p).best, snapshot: run.snapshot });
    view = E.mount({ canvas: board, mascot, game, onSelection(index) {
      if (hud.bomb.getAttribute('aria-pressed') === 'true') return;
      hint.textContent = index === null ? '조각을 탭한 뒤 놓을 칸을 탭하거나 끌어 놓으세요.'
        : '놓을 시작 칸을 탭하세요. 같은 조각을 탭하면 취소됩니다.';
    } });
    let bubbleTimer;
    const currentView = generation;
    game.subscribe((event, state) => {
      audio.play(event.type, event);
      if (event.type === 'lines') {
        speech.textContent = '분개하기!';
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => {
          if (currentView === generation && !modal) speech.textContent = '차변부터 볼까?';
        }, 1100);
      }
      updateHud(state);
      if (['place', 'bomb', 'revive'].includes(event.type)) persist(state);
      if (event.type === 'bomb') {
        hud.bomb.setAttribute('aria-pressed', 'false');
        hint.textContent = '조각을 탭한 뒤 놓을 칸을 탭하거나 끌어 놓으세요.';
      }
      if (event.type === 'goal' || event.type === 'no-moves') {
        run.phase = event.type === 'goal' ? 'mission' : 'revival';
        persist(state);
        stage.classList.add('quest-flash');
        transition = setTimeout(() => {
          stage.classList.remove('quest-flash');
          openMission(run.phase);
        }, event.type === 'goal' ? 220 : 100);
      }
    });
    updateHud(game.state());
    if (run.phase === 'mission' || run.phase === 'revival') openMission(run.phase);
    else if (game.state().status !== 'playing') openMission(game.state().status === 'goal' ? 'mission' : 'revival');
    else persist();
  }

  function revivalProblem(original) {
    const list = D.STAGES[original.corner];
    const index = (original.stage + run.revivals + run.misses) % list.length;
    return list[index === original.stage - 1 ? (index + 1) % list.length : index];
  }

  function promptText(p) {
    return p.prompt.replace(/블록을 골라 부수세요\./g, '알맞은 칩을 고르세요.')
      .replace(/골라 모두 부수세요\./g, '고르세요.').replace(/블록을 부수세요\./g, '칩을 고르세요.');
  }

  function answer(p) {
    if (p.mode === 'pick') return p.picks.map(x => x.label).join(' · ');
    return [['d', '(차)'], ['c', '(대)']].map(([side, label]) => label + ' ' +
      p.entries.filter(e => e.side === side).map(e => e.account + ' ' + format(e.amount)).join(' / ')).join('　');
  }

  function shuffle(items) {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function sameAnswers(placed, expected) {
    if (placed.length !== expected.length) return false;
    const sorted = [...expected].sort();
    return [...placed].sort().every((value, index) => value === sorted[index]);
  }

  function missionGroups(p) {
    if (p.mode === 'pick') return [{ side: 'p', expected: p.picks.map(item => item.label) }];
    return ['d', 'c'].map(side => ({
      side, expected: p.entries.filter(item => item.side === side).map(item => item.account)
    }));
  }

  function amountChoices(p, value) {
    const candidates = [...new Set([value, ...(p.amountDecoys ?? []), ...p.decoys.map(d => d.amount), ...p.entries.map(e => e.amount),
      value + 1000, value + 10000, Math.floor(value * 1.1)])].filter(n => Number.isSafeInteger(n) && n > 0);
    return shuffle(candidates.slice(0, 4));
  }

  function markAnswer(p, ok) {
    const record = levelRecord(p);
    record.attempts = (record.attempts || 0) + 1;
    if (ok) {
      record.correct = (record.correct || 0) + 1;
      record.note = false;
      if (!record.rewarded) {
        record.rewarded = true;
        store.gems += p.amountPhase ? 3 : 2;
      }
    } else {
      record.note = true;
    }
    save();
  }

  function missionPanel(p, kind, review) {
    modal?.remove();
    const shell = el('div', 'quest-overlay');
    const panel = el('section', 'quest-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', kind === 'revival' ? '회계 부활 찬스' : '회계 미션');
    shell.append(panel);
    root.append(shell);
    modal = shell;
    const puzzle = root.querySelector('.play-stage');
    if (puzzle) puzzle.inert = true;
    if (kind === 'review') for (const child of root.children) if (child !== shell && child.tagName !== 'HEADER') child.inert = true;
    if (game) updateHud(game.state());
    view?.react('mission');
    audio.sync();
    const title = kind === 'revival' ? '회계 부활 찬스' : kind === 'review' ? '오답 다시 풀기' : '보스 관문 · 회계 미션';
    const h = el('h2', '', title);
    h.tabIndex = -1;
    const cue = el('p', 'moa-cue', p.mode === 'journal' ? '모아 · 차변부터 볼까?' : '모아 · 조건을 함께 읽어 볼까?');
    const task = el('div', 'mission-task');
    panel.append(h, cue, el('p', 'question', promptText(p)), task);
    h.focus({ preventScroll: true });
    let done = false;

    function finish(ok) {
      if (done) return;
      done = true;
      markAnswer(p, ok);
      audio.play(ok ? 'correct' : 'wrong');
      view?.react(ok ? 'correct' : 'wrong');
      task.replaceChildren();
      task.classList.add(ok ? 'gentle-correct' : 'gentle-warning');
      task.append(el('p', 'feedback', ok ? '정답!' : '🌼 괜찮아요, 함께 다시 살펴봐요!'),
        el('p', 'answer-line', answer(p)), el('p', 'explain', p.explain));
      if (kind === 'review') {
        task.append(button(review.index + 1 < review.items.length ? '다음 복습' : '오답 노트로',
          () => review.index + 1 < review.items.length ? reviewAt(review.items, review.index + 1) : show('notes', { corner: route.corner }), 'primary'));
      } else if (kind === 'revival') {
        if (!ok) {
          store.run = null;
          save();
          task.append(button('다시 도전', () => start(route.problem), 'primary'), button('단계 목록', goBack));
          return;
        }
        run.revivals++;
        run.phase = 'playing';
        game.revive();
        task.append(button('퍼즐 계속하기', () => {
          modal.remove();
          modal = null;
          if (puzzle) puzzle.inert = false;
          updateHud(game.state());
          audio.sync();
        }, 'primary'));
      } else if (!ok) {
        run.misses++;
        run.phase = 'revival';
        persist();
        task.append(button('부활 문제 도전', () => openMission('revival'), 'primary'));
      } else {
        complete(task);
      }
    }

    const amountQuestions = p.entries.length >= 3
      ? [{ title: '차변의 합계는 얼마인가요?', amount: p.entries.filter(entry => entry.side === 'd')
        .reduce((sum, entry) => sum + entry.amount, 0) }]
      : p.entries.map(entry => ({
        title: (entry.side === 'd' ? '차변' : '대변') + ' · ' + entry.account + ' 금액',
        amount: entry.amount
      }));

    function takeAmounts(index = 0) {
      if (index >= amountQuestions.length) { finish(true); return; }
      const question = amountQuestions[index];
      const pool = el('div', 'chip-bank');
      task.replaceChildren(el('p', 'instruction',
        question.title + (amountQuestions.length > 1 ? ' (' + (index + 1) + '/' + amountQuestions.length + ')' : '')), pool);
      for (const value of amountChoices(p, question.amount)) {
        pool.append(button(format(value) + '원', () => value === question.amount ? takeAmounts(index + 1) : finish(false), 'chip'));
      }
    }

    const groups = missionGroups(p);
    function groupAt(index) {
      if (index === groups.length) {
        if (p.mode === 'journal' && (p.amountPhase || p.entries.length >= 3)) takeAmounts();
        else finish(true);
        return;
      }
      const group = groups[index];
      const label = { d: '차변', c: '대변', p: '정답' }[group.side];
      const distractors = p.mode === 'journal'
        ? [...p.entries.filter(e => e.side !== group.side).map(e => e.account), ...p.decoys.map(e => e.account)]
        : p.decoys.map(e => e.label);
      const wrong = shuffle([...new Set(distractors)].filter(v => v && !group.expected.includes(v)));
      const choices = shuffle([...group.expected, ...wrong.slice(0, 4 - group.expected.length)]);
      const slots = group.expected.map(() => null);
      let selected = -1;
      let scored = false;
      const slotsNode = el('div', 'slot-bank');
      const bank = el('div', 'chip-bank');
      task.replaceChildren(el('p', 'instruction', p.mode === 'journal'
        ? label + ' 계정과목을 골라 아래 칸을 누르거나 끌어 놓으세요.' : group.expected.length + '개 칩을 골라 배치하세요.'),
        slotsNode, bank);

      function put(index, choice) {
        if (scored || slots[index] !== null || slots.includes(choice)) return;
        slots[index] = choice;
        selected = -1;
        draw();
        if (slots.every(value => value !== null)) {
          scored = true;
          const placed = slots.map(value => choices[value]);
          if (sameAnswers(placed, group.expected)) {
            audio.play('correct');
            groupAt(indexGroup + 1);
          } else finish(false);
        }
      }

      const indexGroup = index;
      function draw() {
        slotsNode.replaceChildren();
        bank.replaceChildren();
        slots.forEach((choice, slot) => {
          const target = button(choice === null ? label + ' ' + (slot + 1) : choices[choice], () => {
            if (choice !== null) { slots[slot] = null; draw(); }
            else if (selected >= 0) put(slot, selected);
          }, 'slot');
          target.dataset.slot = slot;
          slotsNode.append(target);
        });
        choices.forEach((choice, i) => {
          if (slots.includes(i)) return;
          const chip = button(choice, () => {
            if (p.mode === 'pick') put(slots.indexOf(null), i);
            else {
              selected = selected === i ? -1 : i;
              [...bank.children].forEach(node => node.setAttribute('aria-pressed', String(Number(node.dataset.choice) === selected)));
            }
          }, 'chip');
          chip.dataset.choice = i;
          chip.setAttribute('aria-pressed', String(selected === i));
          bindChipDrag(chip, slot => put(slot, i));
          bank.append(chip);
        });
      }
      draw();
    }
    groupAt(0);
  }

  function bindChipDrag(chip, drop) {
    let start;
    let ghost;
    let ignoreClick = false;
    chip.style.touchAction = 'none';
    chip.addEventListener('click', event => {
      if (ignoreClick) {
        event.stopImmediatePropagation();
        event.preventDefault();
        ignoreClick = false;
      }
    }, true);
    chip.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || start) return;
      ignoreClick = false;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
      chip.setPointerCapture(start.id);
    });
    chip.addEventListener('pointermove', event => {
      if (start?.id !== event.pointerId) return;
      if (!ghost && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
        ghost = el('span', 'chip chip-ghost', chip.textContent);
        ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:20;transform:translate(-50%,-115%)';
        document.body.append(ghost);
      }
      if (ghost) { ghost.style.left = event.clientX + 'px'; ghost.style.top = event.clientY + 'px'; }
    });
    function stop(event) {
      if (start?.id !== event.pointerId) return;
      start = null;
      if (!ghost) return;
      ghost.remove();
      ghost = null;
      ignoreClick = true;
      if (event.type !== 'pointerup') return;
      const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]');
      if (slot) drop(Number(slot.dataset.slot));
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => chip.addEventListener(type, stop));
  }

  function complete(task) {
    const p = route.problem;
    const record = levelRecord(p);
    const stars = Math.max(1, 3 - Math.max(run.misses, run.revivals));
    if (!record.clear) store.gems += 2;
    record.clear = true;
    record.stars = Math.max(record.stars || 0, stars);
    updateProfile();
    store.run = null;
    save();
    audio.play('clear');
    void sendScore();
    task.append(el('strong', 'stars', '★'.repeat(stars) + ' 단계 클리어'));
    const next = D.STAGES[p.corner][p.stage];
    if (next) task.append(button('다음 단계', () => start(next), 'primary'));
    task.append(button('단계 목록', goBack));
  }

  function notes() {
    heading('오답 노트', '틀린 문제를 다시 풀어 정리하세요.');
    const list = all.filter(p => store.levels[p.id]?.note && (!route.corner || route.corner === p.corner));
    if (!list.length) { root.append(el('p', 'panel', '현재 남은 오답이 없어요.')); return; }
    for (const corner of D.CORNERS) {
      const items = list.filter(p => p.corner === corner.key);
      if (!items.length) continue;
      const deck = el('section', 'panel');
      deck.append(el('h2', '', corner.name), button('오답만 다시 풀기', () => reviewAt(items, 0), 'primary'));
      items.forEach((p, index) => {
        const entry = el('details', 'note');
        entry.append(el('summary', '', p.stage + '단계 · ' + p.tag), el('p', '', promptText(p)),
          el('p', 'answer-line', answer(p)), el('p', '', p.explain), button('이 문제 풀기', () => reviewAt(items, index)));
        deck.append(entry);
      });
      root.append(deck);
    }
  }

  function reviewAt(items, index) {
    missionPanel(items[index], 'review', { items, index });
  }

  function codex() {
    heading('계정과목 도감');
    const search = el('input', 'search');
    search.type = 'search';
    search.placeholder = '계정과목 검색';
    search.setAttribute('aria-label', '계정과목 검색');
    const select = el('select');
    select.setAttribute('aria-label', '계정 분류');
    select.append(new Option('전체 분류', ''));
    for (const kind of new Set(Object.values(D.ACCOUNTS).map(item => item.kind))) select.append(new Option(kind, kind));
    const list = el('section', 'panel');
    const draw = () => {
      const q = clean(search.value).replace(/\s/g, '');
      list.replaceChildren();
      for (const [name, item] of Object.entries(D.ACCOUNTS)) {
        if (!name.includes(q) || (select.value && select.value !== item.kind)) continue;
        const line = el('details', 'note');
        line.append(el('summary', '', name), el('p', '', item.kind + ' · 증가 ' + item.inc),
          el('p', '', item.desc), el('p', 'muted', item.ex));
        list.append(line);
      }
      if (!list.children.length) list.append(el('p', '', '검색 결과가 없어요.'));
    };
    search.addEventListener('input', draw);
    select.addEventListener('change', draw);
    root.append(search, select, list);
    draw();
  }

  function report() {
    heading('학습 리포트', '회계 미션과 오답 복습의 정답률을 표시합니다.');
    const weak = new Map();
    for (const p of all) {
      const record = store.levels[p.id];
      const count = (record?.attempts || 0) - (record?.correct || 0);
      if (count > 0) weak.set(p.tag, (weak.get(p.tag) || 0) + count);
    }
    for (const corner of D.CORNERS) {
      const records = D.STAGES[corner.key].map(p => store.levels[p.id]).filter(Boolean);
      const attempted = records.reduce((sum, r) => sum + (r.attempts || 0), 0);
      const correct = records.reduce((sum, r) => sum + (r.correct || 0), 0);
      root.append(el('p', 'panel', corner.name + ' · ' + (attempted ? Math.round(correct / attempted * 100) + '% (' + correct + '/' + attempted + ')' : '미션 기록 없음')));
    }
    if (weak.size) {
      const list = el('section', 'panel');
      list.append(el('h2', '', '자주 틀린 유형'));
      [...weak].sort((a, b) => b[1] - a[1]).slice(0, 5)
        .forEach(([tag, count]) => list.append(el('p', '', tag + ' · ' + count + '회')));
      root.append(list);
    }
  }

  function settings() {
    heading('설정');
    root.append(nicknameForm());
    const panel = el('div', 'panel settings');
    for (const [field, label] of [['effects', '효과음'], ['music', '배경음'], ['speech', '분개하기 음성']]) {
      const line = el('label', '', label);
      const checkbox = el('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!store.settings[field];
      checkbox.addEventListener('change', () => {
        store.settings[field] = checkbox.checked;
        if (field === 'speech' && !checkbox.checked) window.speechSynthesis?.cancel();
        save();
        audio.sync();
      });
      line.append(checkbox);
      panel.append(line);
    }
    panel.append(button('이 기기 진행 초기화', () => {
      if (!window.confirm('이 기기의 단계, 별, 진행 중인 보드, 오답 기록을 초기화할까요?')) return;
      const { nickname, settings } = store;
      store = { ...fresh(), nickname, settings };
      save();
      show('home');
    }, 'danger'));
    root.append(panel);
  }

  function boardConfig() {
    const config = window.BLASTER_BOARD;
    try {
      const url = new URL(config.url);
      if (url.protocol !== 'https:' || !config.key || url.username || url.password || url.search || url.hash ||
          config.submit !== 'moa_blaster_submit' || config.board !== 'moa_blaster_leaderboard' ||
          String(config.key).startsWith('sb_secret_')) return null;
      const middle = config.key.split('.')[1];
      if (middle && JSON.parse(atob(middle.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role') return null;
      return { ...config, url: url.origin };
    } catch { return null; }
  }

  async function rpc(config, method, payload) {
    const signal = new AbortController();
    const timeout = setTimeout(() => signal.abort(), 4500);
    try {
      const headers = { apikey: config.key, 'Content-Type': 'application/json' };
      if (config.key.split('.').length === 3) headers.Authorization = 'Bearer ' + config.key;
      const response = await fetch(config.url + '/rest/v1/rpc/' + method,
        { method: 'POST', headers, body: JSON.stringify(payload), signal: signal.signal });
      if (!response.ok) throw new Error('RPC failed');
      if (response.status === 204) return null;
      const body = await response.text();
      return body ? JSON.parse(body) : null;
    } finally { clearTimeout(timeout); }
  }

  async function sendScore() {
    const config = boardConfig();
    if (!config || !store.nickname) return false;
    const { nickname, best_score, cleared_stages, best_combo } = profile();
    try {
      await rpc(config, config.submit, { p_nickname: nickname, p_best_score: best_score,
        p_cleared_stages: cleared_stages, p_best_combo: best_combo });
      return true;
    } catch { return false; }
  }

  function scoreboard() {
    heading('별명 챌린지 점수판');
    const token = generation;
    const state = el('p', 'summary', '이 기기 기록');
    const list = el('section', 'scoreboard panel');
    const draw = rows => {
      list.replaceChildren();
      const sorted = rows.filter(r => nicknameOk(clean(r.nickname)) &&
        [r.best_score, r.cleared_stages, r.best_combo].every(n => Number.isSafeInteger(Number(n)) && Number(n) >= 0))
        .sort((a, b) => b.best_score - a.best_score || b.cleared_stages - a.cleared_stages || b.best_combo - a.best_combo);
      if (!sorted.length) list.append(el('p', '', '점수 기록이 아직 없어요.'));
      sorted.slice(0, 20).forEach((entry, index) => list.append(el('p', 'rank-row',
        (index + 1) + '. ' + entry.nickname + ' · ' + format(entry.best_score) + '점 · ' +
        entry.cleared_stages + '단계 · 콤보 ' + entry.best_combo)));
    };
    updateProfile();
    save();
    draw(Object.values(store.profiles));
    const sourceHint = el('p', 'muted', '온라인에 연결되기 전에는 이 기기에 저장된 기록이 표시됩니다.');
    root.append(state, sourceHint, list);
    if (!store.nickname) root.append(nicknameForm());
    const config = boardConfig();
    if (!config) return;
    void (async () => {
      if (store.nickname && !await sendScore()) return;
      try {
        const remote = await rpc(config, config.board, {});
        if (generation !== token || !Array.isArray(remote)) return;
        state.textContent = '온라인 점수판 · 상위 20명';
        sourceHint.hidden = true;
        draw(remote);
      } catch { /* 기기 기록 사용 */ }
    })();
  }

  show('home');
})();
