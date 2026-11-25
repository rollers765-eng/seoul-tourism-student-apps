/* 자산모아 블럭모아 Blaster — 화면·진행·사운드 */
(function () {
  'use strict';
  const D = window.BlasterData;
  const Engine = window.BlasterEngine;
  const KEY = 'blaster.v1';
  const $ = (id) => document.getElementById(id);
  const won = (n) => Number(n).toLocaleString('ko-KR') + '원';

  /* ══════════ 저장 ══════════ */
  function fresh() {
    return {
      progress: {},           // corner -> {cleared, stars:{}, best:{}}
      notes: [],              // 오답 노트
      stats: { hit: 0, wrong: 0, side: 0, byCorner: {}, wrongAccounts: {} },
      settings: { sfx: true, bgm: true }
    };
  }
  let S = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      S = Object.assign(fresh(), o);
      S.settings = Object.assign({ sfx: true, bgm: true }, o.settings || {});
      S.stats = Object.assign({ hit: 0, wrong: 0, side: 0, byCorner: {}, wrongAccounts: {} }, o.stats || {});
    }
  } catch (e) { /* 저장소를 못 쓰면 그냥 진행 */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function prog(key) {
    if (!S.progress[key]) S.progress[key] = { cleared: 0, stars: {}, best: {} };
    return S.progress[key];
  }

  /* ══════════ 사운드 (WebAudio 칩튠) ══════════ */
  const A = {
    ctx: null, step: 0, timer: null,
    init() {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        this.ctx = new C();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(freq, dur, type, vol, when, slide) {
      if (!this.ctx || !S.settings.sfx) return;
      const t0 = this.ctx.currentTime + (when || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    shoot(side) { this.tone(side === 'c' ? 620 : 520, 0.07, 'square', 0.045, 0, 300); },
    hit(combo) {
      const f = 440 * Math.pow(1.06, Math.min(12, combo || 1));
      this.tone(f, 0.11, 'triangle', 0.075);
      this.tone(f * 2, 0.07, 'square', 0.03, 0.02);
    },
    sideErr() { this.tone(300, 0.1, 'square', 0.05, 0, 200); },
    bad() { this.tone(150, 0.3, 'sawtooth', 0.07, 0, 60); this.tone(110, 0.3, 'square', 0.04, 0.05, 50); },
    clear() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.06, i * 0.09)); },
    fail() { [440, 372, 311, 233].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.06, i * 0.11)); },
    music(on) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (!on || !S.settings.bgm) return;
      const bass = [131, 131, 165, 196, 131, 147, 175, 196];
      const arp = [392, 494, 587, 494, 440, 523, 659, 523];
      this.timer = setInterval(() => {
        if (!this.ctx || !S.settings.bgm) return;
        const s = this.step++ % 8;
        if (s % 2 === 0) this.tone(bass[s], 0.24, 'triangle', 0.028);
        this.tone(arp[s], 0.09, 'square', 0.012, 0.03);
      }, 260);
    }
  };

  /* ══════════ 화면 전환 ══════════ */
  const SCREENS = ['home', 'stages', 'play', 'note', 'codex', 'report'];
  function show(name) {
    SCREENS.forEach((n) => $('screen-' + n).classList.toggle('is-active', n === name));
    window.scrollTo({ top: 0 });
  }
  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.add('hidden'), ms || 1500);
  }

  /* ══════════ 홈 ══════════ */
  function totalCleared() {
    return D.CORNERS.reduce((s, c) => s + Math.min(c.stages, prog(c.key).cleared), 0);
  }
  function totalStars() {
    return D.CORNERS.reduce((s, c) => s + Object.values(prog(c.key).stars).reduce((a, b) => a + b, 0), 0);
  }
  function renderHome() {
    $('home-total').textContent = totalCleared() + ' / 160 클리어';
    $('home-stars').textContent = '★ ' + totalStars();
    $('home-notes').textContent = '오답 ' + S.notes.length;
    const list = $('corner-list');
    list.innerHTML = '';
    D.CORNERS.forEach((c) => {
      const p = prog(c.key);
      const cleared = Math.min(c.stages, p.cleared);
      const next = Math.min(c.stages, cleared + 1);
      const btn = document.createElement('button');
      btn.className = 'corner-card';
      btn.type = 'button';
      btn.innerHTML =
        '<span class="corner-emoji">' + c.emoji + '</span>' +
        '<span class="corner-body"><span class="corner-name">' + c.name + ' 코너</span>' +
        '<span class="corner-desc">' + c.desc + '</span>' +
        '<span class="mini-bar"><i style="width:' + Math.round((cleared / c.stages) * 100) + '%;background:' + c.color + '"></i></span></span>' +
        '<span class="corner-side"><span class="corner-count">' + cleared + '/' + c.stages + '</span><span class="corner-go">' + (cleared ? next + '단계' : '시작') + '</span></span>';
      btn.addEventListener('click', () => openStages(c.key));
      list.appendChild(btn);
    });
  }

  /* ══════════ 단계 선택 ══════════ */
  let curCorner = null;
  function openStages(key) {
    curCorner = D.CORNERS.find((c) => c.key === key);
    const p = prog(key);
    $('stages-title').textContent = curCorner.name + ' 코너';
    $('stages-desc').textContent = curCorner.desc;
    $('stages-bar').style.width = Math.round((Math.min(curCorner.stages, p.cleared) / curCorner.stages) * 100) + '%';
    const grid = $('stage-grid');
    grid.innerHTML = '';
    // 3차 대비 단계 안내
    const examStages = D.STAGES[key].filter((st) => D.EXAM && D.EXAM[st.gen] && st.stage <= Math.min(curCorner.stages, p.cleared + 1));
    $('stages-hint').innerHTML = examStages.length
      ? '앞 단계를 클리어하면 다음 단계가 열려요. <b>3차</b> 표시는 11/30 서술형평가와 같은 유형이에요.'
      : '앞 단계를 클리어하면 다음 단계가 열려요.';
    const noteBar = $('note-bar');
    const cornerNotes = S.notes.filter((n) => n.corner === key);
    noteBar.classList.toggle('hidden', !cornerNotes.length);
    if (cornerNotes.length) {
      noteBar.textContent = '📕 이 코너 오답 ' + cornerNotes.length + '개 다시 풀기';
      noteBar.onclick = () => { renderNotes(key); show('note'); };
    }
    for (let i = 1; i <= curCorner.stages; i++) {
      const cleared = p.cleared;
      const isDone = i <= cleared;
      const isNext = i === cleared + 1;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'stage-chip ' + (isDone ? 'done' : isNext ? 'next' : '');
      const stars = p.stars[i] || 0;
      const isExam = D.EXAM && D.EXAM[D.STAGES[key][i - 1].gen];
      el.innerHTML = i + '<span class="stars">' + (stars ? '★'.repeat(stars) : (isDone ? '☆' : '')) + '</span>' +
        (isExam ? '<span class="exam-dot">3차</span>' : '');
      if (isDone || isNext) el.addEventListener('click', () => startStage(key, i));
      else el.setAttribute('aria-disabled', 'true');
      grid.appendChild(el);
    }
    show('stages');
  }

  /* ══════════ 플레이 ══════════ */
  let P = null;
  let engine = null;
  let tick = null;

  function startStage(key, stageNo) {
    A.init();
    const corner = D.CORNERS.find((c) => c.key === key);
    const stage = D.STAGES[key][stageNo - 1];
    P = {
      corner, stage, stageNo,
      phase: stage.mode === 'pick' ? 'pick' : 'account',
      filledA: {}, filledM: {}, picksFound: {},
      lives: 3, score: 0, combo: 0, maxCombo: 0,
      timeLimit: stage.timeLimit, timeLeft: stage.timeLimit,
      hintLeft: 1, hits: 0, wrong: 0, sideErr: 0, wrongAccounts: {}, ended: false
    };
    $('overlay').classList.add('hidden');
    $('play-corner').textContent = corner.name + ' 코너';
    $('play-stage').textContent = stageNo + ' / ' + corner.stages + '단계';
    $('play-tag').textContent = stage.tag || corner.name;
    $('prompt-text').textContent = stage.prompt;
    $('hud-score').textContent = '0';
    $('hud-combo').textContent = 'x1';
    $('btn-hint').classList.remove('hidden');
    $('btn-hint').disabled = false;

    const isPick = stage.mode === 'pick';
    $('journal').classList.toggle('hidden', isPick);
    $('pickbar').classList.toggle('hidden', !isPick);
    $('canon-d').classList.toggle('hidden', isPick);
    $('canon-c').classList.toggle('hidden', isPick);
    $('canon-p').classList.toggle('hidden', !isPick);
    document.querySelector('.cannons').classList.toggle('with-pick', isPick);
    setSideUI(isPick ? 'p' : 'd');

    renderJournal();
    renderHearts();
    updateRoundLabel();

    if (!engine) engine = new Engine($('canvas'));
    engine.resize();
    engine.setStage(stage, {
      resolve: resolveBlock,
      onBreak: onBreak,
      onSideError: onSideError,
      onBad: onBad,
      onShoot: (b, side) => A.shoot(side),
      onRoundEmpty: () => {}
    });
    if (isPick) setSideUI('p');

    clearInterval(tick);
    tick = setInterval(() => {
      if (!P || P.ended) return;
      P.timeLeft -= 0.2;
      if (P.timeLeft <= 0) { P.timeLeft = 0; updateHUD(); endStage(false, '시간이 다 됐어요'); return; }
      updateHUD();
    }, 200);

    show('play');
    drawMascot();
    setTimeout(() => engine.resize(), 60);
  }

  function updateRoundLabel() {
    if (!P) return;
    if (P.stage.mode === 'pick') $('play-round').textContent = '정답 ' + P.stage.picks.length + '개';
    else if (P.stage.amountPhase) $('play-round').textContent = P.phase === 'account' ? '1/2 계정 블록' : '2/2 금액 블록';
    else $('play-round').textContent = '계정 블록';
  }

  function renderHearts() {
    const h = $('hearts');
    h.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('i');
      s.className = 'heart' + (i < P.lives ? '' : ' lost');
      h.appendChild(s);
    }
  }

  function updateHUD() {
    if (!P) return;
    $('hud-score').textContent = P.score.toLocaleString('ko-KR');
    $('hud-combo').textContent = 'x' + Math.max(1, P.combo);
    $('hud-time').textContent = Math.ceil(P.timeLeft);
    const pct = Math.max(0, Math.min(100, (P.timeLeft / P.timeLimit) * 100));
    $('timer-bar').style.width = pct + '%';
    $('timer-bar').parentElement.classList.toggle('low', pct < 30);
  }

  function journalLines(side) {
    const out = [];
    P.stage.entries.forEach((e, i) => {
      if (e.side !== side) return;
      out.push({ i, e });
    });
    return out;
  }

  function renderJournal() {
    if (!P) return;
    if (P.stage.mode === 'pick') {
      const wrap = $('pick-slots');
      wrap.innerHTML = '';
      P.stage.picks.forEach((p, i) => {
        const el = document.createElement('i');
        el.textContent = P.picksFound[i] ? '★' : '?';
        if (P.picksFound[i]) el.className = 'on';
        wrap.appendChild(el);
      });
      return;
    }
    ['d', 'c'].forEach((side) => {
      const ul = $(side === 'd' ? 'journal-d' : 'journal-c');
      ul.innerHTML = '';
      const lines = journalLines(side);
      if (!lines.length) {
        ul.innerHTML = '<li class="empty">—</li>';
        return;
      }
      lines.forEach(({ i, e }) => {
        const li = document.createElement('li');
        const known = P.filledA[i];
        const amtKnown = P.filledM[i] || !P.stage.amountPhase || P.phase === 'done';
        li.className = known ? 'filled' : 'empty';
        li.innerHTML = '<span>' + (known ? e.account : '？？？') + '</span>' +
          '<span class="amt">' + (amtKnown ? won(e.amount) : '?') + '</span>';
        ul.appendChild(li);
      });
    });
  }

  function setSideUI(side) {
    document.querySelectorAll('.canon').forEach((b) => b.classList.remove('is-active'));
    document.querySelectorAll('.canon').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    const el = $(side === 'd' ? 'canon-d' : side === 'c' ? 'canon-c' : 'canon-p');
    el.classList.add('is-active');
    el.setAttribute('aria-pressed', 'true');
    if (engine) engine.setSide(side);
  }

  /* ── 타격 판정 ── */
  function resolveBlock(block, side) {
    const st = P.stage;
    if (st.mode === 'pick') {
      const idx = st.picks.findIndex((p, i) => p.label === block.label && !P.picksFound[i]);
      if (idx >= 0) return { result: 'ok', side, points: 120, color: '#c59bff', text: '+120' };
      return { result: 'bad', color: '#ff8fa3' };
    }
    if (P.phase === 'account') {
      const idx = st.entries.findIndex((e, i) => !P.filledA[i] && e.account === block.label && e.side === side);
      if (idx >= 0) return { result: 'ok', idx, side, points: 100, color: side === 'c' ? '#ff8fa3' : '#7ce7c8' };
      const other = st.entries.some((e, i) => !P.filledA[i] && e.account === block.label);
      if (other) return { result: 'side' };
      return { result: 'bad' };
    }
    // 금액 라운드
    const amt = block.amount;
    const idx = st.entries.findIndex((e, i) => !P.filledM[i] && e.amount === amt && e.side === side);
    if (idx >= 0) return { result: 'ok', idx, side, points: 70, color: side === 'c' ? '#ff8fa3' : '#7ce7c8' };
    const other = st.entries.some((e, i) => !P.filledM[i] && e.amount === amt);
    if (other) return { result: 'side' };
    return { result: 'bad' };
  }

  function onBreak(block, res) {
    if (!P || P.ended) return;
    P.hits++;
    S.stats.hit++;
    const byc = S.stats.byCorner[P.corner.key] || (S.stats.byCorner[P.corner.key] = { hit: 0, wrong: 0 });
    byc.hit++;
    P.combo = Math.min(9, P.combo + 1);
    P.maxCombo = Math.max(P.maxCombo, P.combo);
    const base = res.points || 100;
    const gained = base * Math.min(9, P.combo);
    P.score += gained;
    if (P.stage.mode === 'pick') {
      const idx = P.stage.picks.findIndex((p, i) => p.label === block.label);
      if (idx >= 0) P.picksFound[idx] = true;
      renderJournal();
      A.hit(P.combo);
      updateHUD();
      if (P.stage.picks.every((p, i) => P.picksFound[i])) endStage(true);
      return;
    }
    if (P.phase === 'account') {
      // 같은 계정이 두 줄에 있어도 한 번에 채워 준다
      P.stage.entries.forEach((e, i) => { if (e.account === block.label && e.side === res.side) P.filledA[i] = true; });
      P.filledA[res.idx] = true;
      renderJournal();
      A.hit(P.combo);
      updateHUD();
      if (P.stage.entries.every((e, i) => P.filledA[i])) {
        if (P.stage.amountPhase) {
          toast('계정 완성! 이제 금액 블록을 부숴요');
          P.phase = 'amount';
          updateRoundLabel();
          setTimeout(() => { if (P && !P.ended) engine.buildRound('amount'); }, 420);
        } else {
          endStage(true);
        }
      }
      return;
    }
    // 금액 라운드
    P.stage.entries.forEach((e, i) => { if (e.amount === block.amount && e.side === res.side) P.filledM[i] = true; });
    P.filledM[res.idx] = true;
    renderJournal();
    A.hit(P.combo);
    updateHUD();
    if (P.stage.entries.every((e, i) => P.filledM[i])) endStage(true);
  }

  function onSideError(block) {
    if (!P || P.ended) return;
    P.combo = 0;
    P.sideErr++;
    S.stats.side++;
    A.sideErr();
    if (navigator.vibrate) navigator.vibrate(20);
    updateHUD();
    toast('차변/대변을 다시 확인해 봐요!');
  }

  function onBad(block) {
    if (!P || P.ended) return;
    P.lives--;
    P.combo = 0;
    P.wrong++;
    S.stats.wrong++;
    const label = block.label;
    S.stats.wrongAccounts[label] = (S.stats.wrongAccounts[label] || 0) + 1;
    P.wrongAccounts[label] = (P.wrongAccounts[label] || 0) + 1;
    const byc = S.stats.byCorner[P.corner.key] || (S.stats.byCorner[P.corner.key] = { hit: 0, wrong: 0 });
    byc.wrong++;
    A.bad();
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    if (P.wrong === 1) setTimeout(() => { if (P && !P.ended) toast('단서: 그 계정이 늘어나는지 줄어드는지 먼저 생각해 봐요. 힌트 버튼도 있어요', 3000); }, 700);
    renderHearts();
    updateHUD();
    if (P.lives <= 0) endStage(false, '목숨을 모두 잃었어요');
  }

  /* ── 단계 종료 ── */
  function endStage(success, reason) {
    if (!P || P.ended) return;
    P.ended = true;
    clearInterval(tick);
    engine.stop();
    const st = P.stage;
    let stars = 0, bonus = 0;
    if (success) {
      stars = P.lives === 3 ? 3 : P.lives === 2 ? 2 : 1;
      bonus = Math.round(P.timeLeft) * 5 + P.lives * 200;
      P.score += bonus;
      const p = prog(P.corner.key);
      p.cleared = Math.max(p.cleared, P.stageNo);
      p.stars[P.stageNo] = Math.max(p.stars[P.stageNo] || 0, stars);
      p.best[P.stageNo] = Math.max(p.best[P.stageNo] || 0, P.score);
      // 오답 노트에서 지우기 (다시 풀어 성공)
      S.notes = S.notes.filter((n) => !(n.corner === P.corner.key && n.stage === P.stageNo));
      A.clear();
    } else {
      addNote(reason);
      A.fail();
    }
    save();
    showResult(success, stars, bonus, reason);
  }

  function addNote(reason) {
    const st = P.stage;
    S.notes = S.notes.filter((n) => !(n.corner === P.corner.key && n.stage === P.stageNo));
    S.notes.unshift({
      corner: P.corner.key, cornerName: P.corner.name, stage: P.stageNo,
      tag: st.tag, prompt: st.prompt, mode: st.mode,
      entries: st.entries, picks: st.picks, explain: st.explain,
      wrongAccounts: P.wrongAccounts, reason: reason || '',
      at: Date.now()
    });
    S.notes = S.notes.slice(0, 60);
    save();
  }

  function answerHTML(st) {
    if (st.mode === 'pick') {
      return '<div class="answer-box">' + st.picks.map((p) => '<div class="ans-row"><b>정답</b><span>' + p.label + '</span></div>').join('') + '</div>';
    }
    const row = (e) => '<div class="ans-row' + (e.side === 'c' ? ' c' : '') + '"><b>' + (e.side === 'd' ? '차변' : '대변') + '</b><span>' + e.account + '</span><span class="amt">' + won(e.amount) + '</span></div>';
    return '<div class="answer-box">' + st.entries.map(row).join('') + '</div>';
  }

  function showResult(success, stars, bonus, reason) {
    const st = P.stage;
    const ov = $('overlay');
    const card = $('overlay-card');
    const isLast = P.stageNo >= P.corner.stages;
    const starHTML = success
      ? '<div class="stars">' + [1, 2, 3].map((i) => '<span class="' + (i <= stars ? '' : 'off') + '">★</span>').join('') + '</div>'
      : '<div class="stars"><span class="off">★</span><span class="off">★</span><span class="off">★</span></div>';
    const title = success ? (isLast ? '코너 완주!' : '단계 클리어!') : (reason || '다시 도전!');
    card.innerHTML =
      '<h2>' + title + '</h2>' +
      starHTML +
      '<p class="result-line">점수 <b>' + P.score.toLocaleString('ko-KR') + '</b> · 최고 콤보 x' + Math.max(1, P.maxCombo) +
      (success ? ' · 보너스 +' + bonus : '') + '</p>' +
      answerHTML(st) +
      '<div class="explain-box"><b>왜 이렇게 기록할까?</b>' + st.explain + '</div>' +
      '<div class="overlay-actions">' +
      (success
        ? (isLast
          ? '<button class="pxbtn primary wide" data-act="list">목록으로</button>'
          : '<button class="pxbtn primary" data-act="next">다음 단계 →</button><button class="pxbtn ghost" data-act="retry">한 번 더</button>')
        : '<button class="pxbtn primary" data-act="retry">다시 도전</button><button class="pxbtn ghost" data-act="list">목록으로</button>') +
      '</div>';
    ov.classList.remove('hidden');
    card.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const act = b.getAttribute('data-act');
        ov.classList.add('hidden');
        if (act === 'next') startStage(P.corner.key, Math.min(P.corner.stages, P.stageNo + 1));
        else if (act === 'retry') startStage(P.corner.key, P.stageNo);
        else { openStages(P.corner.key); renderHome(); }
      });
    });
  }

  /* ── 힌트 ── */
  function useHint() {
    if (!P || P.ended || P.hintLeft <= 0) return;
    P.hintLeft--;
    P.score = Math.max(0, P.score - 150);
    updateHUD();
    const st = P.stage;
    let msg = '';
    if (st.mode === 'pick') {
      const idx = st.picks.findIndex((p, i) => !P.picksFound[i]);
      msg = '정답 중 하나: ' + st.picks[idx].label;
    } else if (P.phase === 'account') {
      const idx = st.entries.findIndex((e, i) => !P.filledA[i]);
      const e = st.entries[idx];
      msg = (e.side === 'd' ? '차변' : '대변') + '에 「' + e.account + '」';
    } else {
      const idx = st.entries.findIndex((e, i) => !P.filledM[i]);
      const e = st.entries[idx];
      msg = (e.side === 'd' ? '차변' : '대변') + ' 금액 ' + won(e.amount);
    }
    toast('힌트: ' + msg, 3200);
    $('btn-hint').disabled = true;
  }

  /* ══════════ 오답 노트 ══════════ */
  let noteFilter = null;
  function renderNotes(cornerKey) {
    noteFilter = cornerKey || null;
    const wrap = $('note-list');
    const list = noteFilter ? S.notes.filter((n) => n.corner === noteFilter) : S.notes;
    if (!list.length) {
      wrap.innerHTML = '<p class="empty-state">아직 오답이 없어요.<br>단계를 풀다가 틀리면 여기에 모여요.</p>';
      return;
    }
    wrap.innerHTML = '';
    list.forEach((n) => {
      const el = document.createElement('div');
      el.className = 'note-card';
      const ans = n.mode === 'pick'
        ? '<div class="note-answer"><div>정답: ' + n.picks.map((p) => p.label).join(', ') + '</div></div>'
        : '<div class="note-answer">' + n.entries.map((e) => '<div>' + (e.side === 'd' ? '차변 ' : '대변 ') + e.account + ' <span class="amt">' + won(e.amount) + '</span></div>').join('') + '</div>';
      el.innerHTML = '<h3>' + n.cornerName + ' ' + n.stage + '단계 · ' + (n.tag || '') + '</h3>' +
        '<p>' + n.prompt + '</p>' + ans +
        '<div class="note-explain">' + n.explain + '</div>' +
        '<div class="row"><button class="pxbtn primary" data-id="' + n.corner + ',' + n.stage + '">다시 풀기</button></div>';
      wrap.appendChild(el);
    });
    wrap.querySelectorAll('button[data-id]').forEach((b) => {
      b.addEventListener('click', () => {
        const parts = b.getAttribute('data-id').split(',');
        startStage(parts[0], Number(parts[1]));
      });
    });
  }

  /* ══════════ 도감 ══════════ */
  let codexFilter = '전체';
  function renderCodex() {
    const q = ($('codex-search').value || '').trim();
    const filters = ['전체', '자산', '투자자산', '유형자산', '무형자산', '비용', '수익', '부채'];
    const fwrap = $('codex-filters');
    if (!fwrap.dataset.done) {
      filters.forEach((f) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = f;
        b.setAttribute('aria-pressed', f === codexFilter ? 'true' : 'false');
        b.addEventListener('click', () => { codexFilter = f; renderCodex(); });
        fwrap.appendChild(b);
      });
      fwrap.dataset.done = '1';
    }
    fwrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.textContent === codexFilter ? 'true' : 'false'));
    const list = $('codex-list');
    list.innerHTML = '';
    const keys = Object.keys(D.ACCOUNTS).filter((k) => {
      const a = D.ACCOUNTS[k];
      if (codexFilter !== '전체' && a.kind.indexOf(codexFilter) < 0 && !(codexFilter === '자산' && a.kind.indexOf('자산') >= 0)) return false;
      if (q && k.indexOf(q) < 0 && a.desc.indexOf(q) < 0) return false;
      return true;
    });
    if (!keys.length) { list.innerHTML = '<p class="empty-state">찾는 계정과목이 없어요.</p>'; return; }
    keys.forEach((k) => {
      const a = D.ACCOUNTS[k];
      const el = document.createElement('div');
      el.className = 'codex-item';
      el.innerHTML = '<h3>' + k + '<em>' + a.kind + '</em><em>' + a.inc + ' 증가</em></h3>' +
        '<p>' + a.desc + '</p><p class="ex">' + a.ex + '</p>';
      list.appendChild(el);
    });
  }

  /* ══════════ 리포트 ══════════ */
  function renderReport() {
    const wrap = $('report-body');
    const totalHit = S.stats.hit, totalWrong = S.stats.wrong;
    const acc = totalHit + totalWrong ? Math.round((totalHit / (totalHit + totalWrong)) * 100) : 0;
    let html = '<div class="report-grid">';
    html += '<div class="report-card"><div class="big-stat"><b>' + totalCleared() + '</b><span>/ 160 단계 클리어</span></div>' +
      '<div class="report-row"><span>총 별</span><b>★ ' + totalStars() + '</b></div>' +
      '<div class="report-row"><span>판정 정확도</span><b>' + acc + '%</b></div>' +
      '<div class="report-row"><span>차/대 혼동</span><b>' + S.stats.side + '회</b></div>' +
      '<div class="report-row"><span>오답 노트</span><b>' + S.notes.length + '개</b></div></div>';
    D.CORNERS.forEach((c) => {
      const p = prog(c.key);
      const b = S.stats.byCorner[c.key] || { hit: 0, wrong: 0 };
      const a = b.hit + b.wrong ? Math.round((b.hit / (b.hit + b.wrong)) * 100) : 0;
      const stars = Object.values(p.stars).reduce((x, y) => x + y, 0);
      html += '<div class="report-card"><h3>' + c.emoji + ' ' + c.name + '</h3>' +
        '<div class="report-row"><span>클리어</span><b>' + Math.min(c.stages, p.cleared) + ' / ' + c.stages + '</b></div>' +
        '<div class="report-row"><span>별</span><b>★ ' + stars + '</b></div>' +
        '<div class="report-row"><span>정확도</span><b>' + a + '%</b></div></div>';
    });
    const wrongs = Object.keys(S.stats.wrongAccounts).sort((a, b) => S.stats.wrongAccounts[b] - S.stats.wrongAccounts[a]).slice(0, 5);
    html += '<div class="report-card"><h3>자주 틀린 계정과목</h3>' +
      (wrongs.length ? '<div class="wrong-tags">' + wrongs.map((w) => '<span>' + w + ' ×' + S.stats.wrongAccounts[w] + '</span>').join('') + '</div>'
        : '<p class="empty-state" style="padding:12px 0">아직 기록이 없어요.</p>') + '</div>';
    html += '</div>';
    wrap.innerHTML = html;
  }

  /* ══════════ 설정 ══════════ */
  function openSettings() {
    const card = $('overlay-card');
    card.innerHTML = '<h2>설정</h2>' +
      '<div class="setting-row"><span>효과음</span><button class="switch' + (S.settings.sfx ? ' on' : '') + '" id="sw-sfx"><i></i></button></div>' +
      '<div class="setting-row"><span>배경음악</span><button class="switch' + (S.settings.bgm ? ' on' : '') + '" id="sw-bgm"><i></i></button></div>' +
      '<div class="setting-row"><span>진행 초기화</span><button class="pxbtn pink" id="btn-reset" style="min-height:36px;font-size:11px;padding:6px 10px">모두 지우기</button></div>' +
      '<p style="font-size:11px;color:#9aa5cc;line-height:1.6;margin:12px 0">이 게임은 로그인 없이 이 기기에만 진행을 저장해요. 개인정보를 서버로 보내지 않아요.</p>' +
      '<div class="overlay-actions"><button class="pxbtn wide" id="sw-close">닫기</button></div>';
    $('overlay').classList.remove('hidden');
    $('sw-sfx').addEventListener('click', () => { S.settings.sfx = !S.settings.sfx; save(); openSettings(); });
    $('sw-bgm').addEventListener('click', () => {
      S.settings.bgm = !S.settings.bgm; save();
      A.init(); A.music(S.settings.bgm); openSettings();
    });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('저장한 진행·오답을 모두 지울까요? 되돌릴 수 없어요.')) {
        S = fresh(); save(); renderHome(); $('overlay').classList.add('hidden'); toast('진행을 초기화했어요');
      }
    });
    $('sw-close').addEventListener('click', () => $('overlay').classList.add('hidden'));
  }

  /* ══════════ 모아 스프라이트 ══════════ */
  function drawMascot() {
    const c = $('mascot');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    Engine.drawSprite(ctx, 2, 0, 0);
  }

  /* ══════════ 이벤트 연결 ══════════ */
  function wire() {
    $('btn-notes').addEventListener('click', () => { renderNotes(); show('note'); });
    $('btn-codex').addEventListener('click', () => { renderCodex(); show('codex'); });
    $('btn-report').addEventListener('click', () => { renderReport(); show('report'); });
    $('btn-settings').addEventListener('click', openSettings);
    $('btn-stages-back').addEventListener('click', () => { renderHome(); show('home'); });
    $('btn-stages-codex').addEventListener('click', () => { renderCodex(); show('codex'); });
    $('btn-note-back').addEventListener('click', () => { renderHome(); show('home'); });
    $('btn-note-clear').addEventListener('click', () => {
      if (!S.notes.length) return;
      if (confirm('오답 노트를 비울까요?')) { S.notes = []; save(); renderNotes(); renderHome(); }
    });
    $('btn-codex-back').addEventListener('click', () => { renderHome(); show('home'); });
    $('btn-report-back').addEventListener('click', () => { renderHome(); show('home'); });
    $('codex-search').addEventListener('input', renderCodex);

    $('btn-play-back').addEventListener('click', () => {
      if (!P) { openStages(curCorner.key); return; }
      if (P.ended) { openStages(P.corner.key); return; }
      if (!confirm('이 단계를 그만둘까요? 지금까지의 점수는 사라져요.')) return;
      P.ended = true; clearInterval(tick); if (engine) engine.stop(); openStages(P.corner.key);
    });
    $('btn-hint').addEventListener('click', useHint);

    $('canon-d').addEventListener('click', () => { setSideUI('d'); A.init(); });
    $('canon-c').addEventListener('click', () => { setSideUI('c'); A.init(); });
    $('canon-p').addEventListener('click', () => { setSideUI('p'); A.init(); });

    document.addEventListener('keydown', (e) => {
      if (!$('screen-play').classList.contains('is-active')) return;
      if (e.key === '1' || e.key === 'ArrowLeft') setSideUI('d');
      else if (e.key === '2' || e.key === 'ArrowRight') setSideUI('c');
      else if (e.key === '3') setSideUI('p');
      else if (e.key === 'h' || e.key === 'H') useHint();
    });

    window.addEventListener('resize', () => { if (engine) engine.resize(); });
    // 첫 터치에 오디오 깨우기
    const wake = () => { A.init(); A.music(S.settings.bgm); document.removeEventListener('pointerdown', wake); };
    document.addEventListener('pointerdown', wake);
  }

  /* 점검용(수업 준비·자동 점검에서 상태를 읽기만 함) */
  window.BlasterApp = { state: () => P, engine: () => engine };
  if (location.hash === '#dev') {
    window.BlasterDev = {
      start: (key, n) => startStage(key, n),
      unlock: () => { D.CORNERS.forEach((c) => { prog(c.key).cleared = c.stages; }); save(); renderHome(); }
    };
  }

  /* ══════════ 시작 ══════════ */
  renderHome();
  wire();
  drawMascot();
  if (location.hash === '#codex') { renderCodex(); show('codex'); }
})();
