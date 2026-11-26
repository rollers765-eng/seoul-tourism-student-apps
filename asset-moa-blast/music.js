/* 자산모아 블럭모아 Blast — 신나는 업비트 BGM 3트랙 순환 + 효과음 (WebAudio 실시간 합성)
   트랙1 선샤인 마림바(126BPM·C) → 트랙2 버블 팝(134BPM·F) → 트랙3 스타 라이트(142BPM·Am)
   각 트랙 8마디(64스텝)를 끝까지 연주하면 다음 트랙으로 넘어간다. */
(function () {
  'use strict';
  const LOOP = 64;                            // 8마디 × 8스텝
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let timer = null, nextTime = 0, step = 0, enabled = true, started = false;
  let trackIdx = 0, cbTrack = null;

  const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const nz = (len) => {
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * len)), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };

  /* ───────── 트랙 정의 ───────── */
  const TRACKS = [
    {
      name: '선샤인 마림바', bpm: 126,
      leadType: 'triangle', leadLvl: 0.085, padType: 'sawtooth', padLvl: 0.028, bassType: 'sine',
      kick: '10101010', clap: '00100010', hat16: false, openHat: false,
      /* C – G – Am – F / C – G – F – G */
      chords: [
        { root: 36, notes: [60, 64, 67] }, { root: 43, notes: [59, 62, 67] },
        { root: 45, notes: [57, 60, 64] }, { root: 41, notes: [57, 60, 65] },
        { root: 36, notes: [60, 64, 67] }, { root: 43, notes: [59, 62, 67] },
        { root: 41, notes: [57, 60, 65] }, { root: 43, notes: [59, 62, 67] }
      ],
      lead: [
        [72, 0, 76, 79, 0, 76, 79, 84],
        [83, 0, 79, 74, 0, 79, 83, 86],
        [81, 0, 76, 72, 0, 76, 81, 84],
        [77, 0, 81, 84, 0, 81, 77, 72],
        [72, 0, 76, 79, 0, 84, 88, 84],
        [83, 0, 86, 79, 0, 83, 86, 91],
        [89, 0, 84, 81, 0, 77, 81, 84],
        [83, 0, 86, 79, 0, 74, 78, 83]
      ],
      bass: [36, 0, 36, 43, 36, 0, 43, 36]
    },
    {
      name: '버블 팝', bpm: 134,
      leadType: 'square', leadLvl: 0.05, padType: 'triangle', padLvl: 0.032, bassType: 'triangle',
      kick: '10010010', clap: '00100010', hat16: true, openHat: false,
      /* F – C – Dm – Bb / F – C – Bb – C */
      chords: [
        { root: 41, notes: [57, 60, 65] }, { root: 36, notes: [60, 64, 67] },
        { root: 38, notes: [62, 65, 69] }, { root: 34, notes: [58, 62, 65] },
        { root: 41, notes: [57, 60, 65] }, { root: 36, notes: [60, 64, 67] },
        { root: 34, notes: [58, 62, 65] }, { root: 36, notes: [60, 64, 67] }
      ],
      lead: [
        [77, 0, 81, 84, 0, 81, 77, 74],
        [76, 0, 79, 84, 0, 79, 76, 72],
        [77, 0, 81, 86, 0, 84, 81, 77],
        [74, 0, 77, 82, 0, 79, 77, 74],
        [77, 0, 81, 84, 0, 86, 89, 84],
        [84, 0, 79, 76, 0, 79, 84, 88],
        [82, 0, 77, 74, 0, 77, 82, 86],
        [79, 0, 84, 81, 0, 76, 79, 84]
      ],
      bass: [41, 0, 41, 48, 41, 0, 46, 41]
    },
    {
      name: '스타 라이트', bpm: 142,
      leadType: 'sawtooth', leadLvl: 0.042, padType: 'sawtooth', padLvl: 0.026, bassType: 'sine',
      kick: '10101010', clap: '00100100', hat16: true, openHat: true,
      /* Am – F – C – G / Am – F – G – Am */
      chords: [
        { root: 33, notes: [57, 60, 64] }, { root: 29, notes: [57, 60, 65] },
        { root: 36, notes: [60, 64, 67] }, { root: 31, notes: [59, 62, 67] },
        { root: 33, notes: [57, 60, 64] }, { root: 29, notes: [57, 60, 65] },
        { root: 31, notes: [59, 62, 67] }, { root: 33, notes: [57, 60, 64] }
      ],
      lead: [
        [69, 72, 76, 81, 84, 81, 76, 72],
        [65, 69, 72, 77, 81, 77, 72, 69],
        [76, 79, 84, 88, 84, 79, 76, 72],
        [74, 79, 83, 86, 83, 79, 74, 71],
        [69, 72, 76, 81, 84, 81, 76, 72],
        [77, 81, 84, 88, 84, 81, 77, 72],
        [79, 83, 86, 91, 86, 83, 79, 74],
        [69, 76, 81, 84, 81, 76, 72, 69]
      ],
      bass: [33, 0, 33, 40, 33, 0, 40, 33]
    }
  ];
  const track = () => TRACKS[trackIdx];
  const stepDur = () => 60 / track().bpm / 2;   // 8분음표 길이

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.85; sfxGain.connect(master);
    return ctx;
  }

  function tone(o) {
    if (!ctx) return;
    const t = o.at || ctx.currentTime, dur = o.dur || 0.2, lvl = o.lvl == null ? 0.12 : o.lvl;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(freq(o.note), t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq(o.slideTo)), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + (o.atk || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || musicGain);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  function noise(o) {
    if (!ctx) return;
    const t = o.at || ctx.currentTime, dur = o.dur || 0.08;
    const src = ctx.createBufferSource(); src.buffer = o.buf || nz(dur);
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'highpass';
    f.frequency.setValueAtTime(o.freq || 6000, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(120, o.sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.lvl == null ? 0.09 : o.lvl, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || musicGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function kick(at) {
    if (!ctx) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(46, at + 0.13);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.55, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);
    osc.connect(g); g.connect(musicGain);
    osc.start(at); osc.stop(at + 0.22);
  }
  function clap(at, lvl) {
    const b = nz(0.16);
    [0, 0.012, 0.026].forEach(function (d) {
      noise({ at: at + d, dur: 0.055, lvl: (lvl || 0.13), freq: 1400, filter: 'bandpass', buf: b });
    });
  }
  function hat(at, lvl) { noise({ at: at, dur: 0.035, lvl: lvl || 0.035, freq: 9000 }); }

  function playStep(k, at) {
    const tr = track();
    const bar = Math.floor(k / 8) % 8, beat = k % 8, ch = tr.chords[bar];
    const sd = stepDur();
    // 리드
    const n = tr.lead[bar][beat];
    if (n) {
      tone({ note: n, at: at, dur: Math.min(0.52, sd * 2.2), lvl: tr.leadLvl, type: tr.leadType });
      tone({ note: n + 12, at: at, dur: 0.28, lvl: tr.leadLvl * 0.34, type: 'sine' });
    }
    // 베이스
    const b = tr.bass[beat];
    if (b) tone({ note: b, at: at, dur: 0.23, lvl: 0.15, type: tr.bassType, atk: 0.01 });
    // 리듬
    if (tr.kick[beat] === '1') kick(at);
    if (tr.clap[beat] === '1') clap(at, 0.11);
    hat(at, beat % 2 ? 0.026 : 0.044);
    if (tr.hat16) hat(at + sd / 2, 0.016);
    // 패드 (마디 첫 박)
    if (beat === 0) {
      ch.notes.forEach(function (m, i) {
        tone({ note: m, at: at, dur: 0.9, lvl: tr.padLvl, type: tr.padType, detune: (i - 1) * 6, atk: 0.05 });
      });
    }
    // 반짝이는 필
    if (beat === 5 && bar % 2 === 1) tone({ note: ch.notes[2] + 24, at: at, dur: 0.16, lvl: 0.03, type: 'sine' });
    if (tr.openHat && beat === 7) noise({ at: at, dur: 0.16, lvl: 0.028, freq: 8200 });
  }

  function advanceTrack() {
    trackIdx = (trackIdx + 1) % TRACKS.length;
    step = 0;
    if (typeof cbTrack === 'function') {
      try { cbTrack({ index: trackIdx, name: TRACKS[trackIdx].name, total: TRACKS.length }); } catch (e) {}
    }
  }

  function schedule() {
    if (!ctx || ctx.state !== 'running' || !enabled) return;
    if (nextTime < ctx.currentTime - 0.3) nextTime = ctx.currentTime + 0.03;
    while (nextTime < ctx.currentTime + 0.2) {
      if (step >= LOOP) advanceTrack();
      playStep(step, nextTime);
      step = (step + 1) % (LOOP + 1);
      nextTime += stepDur();
    }
  }

  function startMusic() {
    if (!ensure() || !enabled) return;
    if (ctx.state === 'running' && timer) return;
    const go = ctx.state !== 'running' ? ctx.resume() : Promise.resolve();
    go.then(function () {
      if (!enabled || document.hidden) return;
      started = true;
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setTargetAtTime(0.46, ctx.currentTime, 0.4);
      nextTime = ctx.currentTime + 0.05;
      if (!timer) { schedule(); timer = setInterval(schedule, 70); }
    }).catch(function () {});
  }
  function stopMusic() {
    if (timer) { clearInterval(timer); timer = null; }
    if (ctx && musicGain) musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
  }

  /* ───── 효과음 ───── */
  function ladder(n) {
    const offsets = [0, 2, 4, 7, 9];
    const step = Math.max(0, Math.min(offsets.length - 1, Math.trunc(Number(n) || 1) - 1));
    // Rotate through C-major pentatonic, continuing into the next octave.
    const notes = offsets.map((_, i) => {
      const degree = step + i;
      return 72 + offsets[degree % offsets.length] + 12 * Math.floor(degree / offsets.length);
    });
    return { step, notes, freqs: notes.map(freq) };
  }

  const sfx = {
    place: function () {
      tone({ note: 84, at: 0, dur: 0.09, lvl: 0.14, type: 'square', bus: sfxGain });
      tone({ note: 91, dur: 0.07, lvl: 0.05, type: 'sine', bus: sfxGain });
    },
    clear: function (lines) {
      const base = 72 + Math.min(12, ((lines || 1) - 1) * 4);
      for (let i = 0; i < 6; i++) {
        tone({ note: base + i * 2, at: ctx.currentTime + i * 0.035, dur: 0.22, lvl: 0.11, type: 'triangle', bus: sfxGain });
      }
      noise({ dur: 0.3, lvl: 0.08, freq: 2200, sweep: 400, bus: sfxGain });
    },
    stamp: function () {
      tone({ note: 37, dur: 0.12, lvl: 0.08, type: 'sine', bus: sfxGain });
      noise({ dur: 0.05, lvl: 0.025, freq: 1400, bus: sfxGain });
    },
    combo: function (n) {
      const { notes } = ladder(n);
      const start = ctx.currentTime;
      notes.forEach((note, i) => {
        tone({ note, at: start + i * 0.045, dur: 0.18, lvl: 0.08, type: 'triangle', bus: sfxGain });
      });
      tone({ note: notes.at(-1) + 12, at: start + 0.18, dur: 0.18, lvl: 0.025, type: 'sine', bus: sfxGain });
    },
    right: function () {
      [0, 4, 7, 12, 16].forEach(function (d, i) {
        tone({ note: 72 + d, at: ctx.currentTime + i * 0.06, dur: 0.32, lvl: 0.13, type: 'triangle', bus: sfxGain });
      });
    },
    wrong: function () {
      tone({ note: 59, at: ctx.currentTime, dur: 0.18, lvl: 0.1, type: 'triangle', slideTo: 50, bus: sfxGain });
      tone({ note: 55, at: ctx.currentTime + 0.11, dur: 0.24, lvl: 0.08, type: 'sine', slideTo: 45, bus: sfxGain });
    },
    gem: function () {
      tone({ note: 88, at: ctx.currentTime, dur: 0.16, lvl: 0.1, type: 'sine', bus: sfxGain });
      tone({ note: 95, at: ctx.currentTime + 0.07, dur: 0.22, lvl: 0.08, type: 'sine', bus: sfxGain });
    },
    applause: function () {
      const b = nz(0.9), t = ctx.currentTime;
      for (let i = 0; i < 26; i++) {
        const at = t + Math.random() * 0.75;
        noise({ at: at, dur: 0.05 + Math.random() * 0.04, lvl: 0.02 + Math.random() * 0.035, freq: 1800, filter: 'bandpass', buf: b, bus: sfxGain });
      }
    },
    whistle: function () {
      const t = ctx.currentTime + 0.08;
      const osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(1150, t);
      osc.frequency.exponentialRampToValueAtTime(1900, t + 0.28);
      osc.frequency.exponentialRampToValueAtTime(1250, t + 0.55);
      lfo.type = 'sine'; lfo.frequency.value = 8; lg.gain.value = 40;
      lfo.connect(lg); lg.connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.58);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); lfo.start(t);
      osc.stop(t + 0.6); lfo.stop(t + 0.6);
      noise({ at: t, dur: 0.5, lvl: 0.02, freq: 3000, filter: 'highpass', bus: sfxGain });
    },
    boom: function () {
      const t = ctx.currentTime;
      tone({ note: 40, at: t, dur: 0.5, lvl: 0.16, type: 'sine', slideTo: 24, bus: sfxGain });
      noise({ at: t, dur: 0.32, lvl: 0.09, freq: 900, sweep: 160, bus: sfxGain });
    },
    whoosh: function () {
      noise({ dur: 0.25, lvl: 0.06, freq: 500, sweep: 4000, filter: 'bandpass', bus: sfxGain });
    }
  };

  function play(name, arg) {
    if (!ensure()) return;
    if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }
    const f = sfx[name];
    if (f) { try { f(arg); } catch (e) {} }
  }

  /* ───── 버튼·UI ───── */
  const btn = document.getElementById('btnMusic');
  function label() {
    if (!btn) return;
    btn.textContent = enabled ? '🎵' : '🔇';
    btn.setAttribute('aria-pressed', String(enabled));
    btn.setAttribute('aria-label', enabled ? '배경음악 끄기' : '배경음악 켜기');
  }
  if (btn) {
    btn.addEventListener('click', function () {
      enabled = !enabled; label();
      if (enabled) startMusic(); else stopMusic();
    });
    label();
  }

  /* iOS Safari: 첫 사용자 제스처 안에서 AudioContext.resume() 이 불려야 소리가 난다.
     녹음이 될 때까지 pointerdown·touchend·click 마다 다시 열어 본다. */
  function unlock() {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended' || c.state === 'interrupted') {
      try { c.resume().catch(() => {}); } catch (e) {}
    }
    startMusic();
  }
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('click', unlock, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) stopMusic();
    else if (enabled && started) startMusic();
  });

  window.MoaSound = {
    play: play,
    ladder,
    start: startMusic,
    stop: stopMusic,
    isOn: function () { return enabled; },
    set: function (v) { enabled = !!v; label(); if (enabled) startMusic(); else stopMusic(); },
    /* 지금 재생 중인 트랙 정보 / 트랙이 바뀔 때 알림 */
    track: function () { return { index: trackIdx, name: TRACKS[trackIdx].name, total: TRACKS.length }; },
    setOnTrack: function (fn) { cbTrack = fn; },
    /* 점검용: 오디오 상태와 진행 상황 */
    status: function () {
      return { enabled: enabled, started: started, state: ctx ? ctx.state : 'none', track: trackIdx, step: step, timer: !!timer };
    }
  };
})();
