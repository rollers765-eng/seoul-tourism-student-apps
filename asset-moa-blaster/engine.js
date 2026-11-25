/* 자산모아 블럭모아 Blaster — 2D 픽셀 블록 블라스터 엔진 (canvas) */
(function (root) {
  'use strict';
  const W = 480;                 // 논리 가로 폭
  const rnd = (a, b) => a + Math.random() * (b - a);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* 16×16 픽셀 모아 스프라이트 */
  const MOA = [
    '................',
    '.....222222.....',
    '....23333332....',
    '...2333333332...',
    '...2311111132...',
    '...2311111132...',
    '...2311111132...',
    '...2333333332...',
    '....23344332....',
    '.....222222.....',
    '...2222222222...',
    '..25555555552...',
    '..25555555552...',
    '..25555555552...',
    '...22222222.....',
    '................'
  ];
  const MOA_COLORS = { '1': '#2a1a35', '2': '#2a1a35', '3': '#ffd9a0', '4': '#ff8fa3', '5': '#7ce7c8' };

  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.blocks = [];
      this.particles = [];
      this.shots = [];
      this.pops = [];
      this.side = 'd';
      this.phase = 'account';
      this.shake = 0;
      this.t = 0;
      this.running = false;
      this.hoverIdx = -1;
      this.stars = [];
      this.flashTimer = 0;
      this.flashColor = '#fff';
      this.bindPointer();
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const cssW = rect.width || 360;
      const cssH = rect.height || 320;
      this.W = W;
      this.H = Math.max(240, Math.min(560, W * (cssH / cssW)));
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(this.W * dpr);
      this.canvas.height = Math.round(this.H * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.stage) this.layout();
    }

    /* ── 단계 세팅 ── */
    setStage(stage, hooks) {
      this.stage = stage;
      this.hooks = hooks || {};
      this.side = stage.mode === 'pick' ? 'p' : 'd';
      this.phase = 'account';
      this.particles = []; this.shots = []; this.pops = [];
      this.shake = 0;
      this.buildRound('account');
      this.start();
    }

    buildRound(phase) {
      const st = this.stage;
      this.phase = phase;
      let items = [];
      if (st.mode === 'pick') {
        items = st.picks.map((p) => ({ label: p.label, kind: 'pick', key: 'pick:' + p.label }))
          .concat(st.decoys.map((p) => ({ label: p.label, kind: 'pick', key: 'bad:' + p.label })));
      } else if (phase === 'account') {
        const seen = {};
        st.entries.forEach((e, i) => {
          if (seen[e.account]) return; seen[e.account] = 1;
          items.push({ label: e.account, kind: 'account', key: 'acct:' + e.account });
        });
        st.decoys.forEach((d) => items.push({ label: d.account, kind: 'bad', key: 'bad:' + d.account }));
      } else {
        st.entries.forEach((e, i) => items.push({ label: Engine.won(e.amount), kind: 'amount', key: 'amt:' + i, amount: e.amount, side: e.side }));
        (st.amountDecoys || []).forEach((v, i) => items.push({ label: Engine.won(v), kind: 'bad', key: 'badamt:' + i, amount: -1 }));
      }
      items = this.shuffle(items);
      this.blocks = items.map((it, i) => Object.assign(it, { id: i, alive: true, breaking: 0, shakeT: 0, delay: i * 45 }));
      this.layout();
    }

    shuffle(a) {
      const arr = a.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }

    layout() {
      const n = this.blocks.length || 1;
      const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
      const rows = Math.ceil(n / cols);
      const padX = 14, gap = 8;
      const areaTop = 8;
      const areaH = this.H - 8 - 58;   // 아래쪽 캐논 자리
      const bw = Math.floor((this.W - padX * 2 - gap * (cols - 1)) / cols);
      let bh = Math.floor((areaH - gap * (rows - 1)) / rows);
      bh = Math.max(38, Math.min(72, bh));
      const totalH = rows * bh + (rows - 1) * gap;
      const y0 = areaTop + Math.max(0, (areaH - totalH) / 2);
      this.blocks.forEach((b, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        b.w = bw; b.h = bh;
        b.x = padX + c * (bw + gap);
        b.y = y0 + r * (bh + gap);
        b.alive = true; b.breaking = 0;
      });
      this.cols = cols;
      this.muzzle = { d: { x: this.W * 0.24, y: this.H - 30 }, c: { x: this.W * 0.76, y: this.H - 30 } };
    }

    start() { if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.loop(t)); } }
    stop() { this.running = false; }

    setSide(side) {
      if (this.side === side) return;
      this.side = side;
      this.hooks.onSide && this.hooks.onSide(side);
    }

    bindPointer() {
      const pos = (ev) => {
        const r = this.canvas.getBoundingClientRect();
        const x = ((ev.clientX - r.left) / r.width) * this.W;
        const y = ((ev.clientY - r.top) / r.height) * this.H;
        return { x, y };
      };
      this.canvas.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const p = pos(ev);
        this.tap(p.x, p.y);
      });
    }

    blockAt(x, y) {
      for (let i = this.blocks.length - 1; i >= 0; i--) {
        const b = this.blocks[i];
        if (!b.alive) continue;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
      }
      return null;
    }

    tap(x, y) {
      if (!this.running) return;
      const b = this.blockAt(x, y);
      if (!b) return;
      if (this.shots.length) return;
      this.fire(b);
    }

    fire(b) {
      const side = this.side === 'p' ? 'p' : this.side;
      const from = this.side === 'p' ? { x: this.W / 2, y: this.H - 30 } : this.muzzle[this.side];
      this.shots.push({ x: from.x, y: from.y, tx: b.x + b.w / 2, ty: b.y + b.h / 2, t: 0, dur: 0.12, target: b, side });
      this.hooks.onShoot && this.hooks.onShoot(b, side);
    }

    resolveShot(shot) {
      const b = shot.target;
      if (!b || !b.alive) return;
      const res = (this.hooks.resolve && this.hooks.resolve(b, shot.side)) || { result: 'bad' };
      if (res.result === 'ok') {
        b.alive = false;
        b.breaking = 0.28;
        this.burst(b, res.color || '#7ce7c8');
        this.pops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, text: res.text || '+100', life: 0.9, color: res.color || '#fff8b0' });
        this.shake = Math.min(12, 3 + (res.combo || 1) * 0.8);
        this.flash('#ffffff', 0.06);
        if (this.hooks.onBreak) this.hooks.onBreak(b, res);
      } else if (res.result === 'side') {
        b.shakeT = 0.36;
        this.shake = 3;
        this.flash('#ffc24b', 0.08);
        this.pops.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, text: '차/대 확인!', life: 0.8, color: '#ffc24b' });
        if (this.hooks.onSideError) this.hooks.onSideError(b, res);
      } else {
        b.alive = false;
        b.breaking = 0.28;
        this.burst(b, '#ff6b81');
        this.shake = 8;
        this.flash('#ff4d6d', 0.12);
        if (this.hooks.onBad) this.hooks.onBad(b, res);
      }
      // 남은 블록 확인
      const left = this.blocks.filter((x) => x.alive).length;
      if (left === 0 && this.hooks.onRoundEmpty) this.hooks.onRoundEmpty();
    }

    burst(b, color) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      for (let i = 0; i < 16; i++) {
        this.particles.push({
          x: cx + rnd(-b.w / 4, b.w / 4), y: cy + rnd(-b.h / 4, b.h / 4),
          vx: rnd(-160, 160), vy: rnd(-230, -30), life: rnd(0.35, 0.75), max: 0.75,
          size: rnd(3, 7), color: i % 3 === 0 ? '#ffffff' : color
        });
      }
    }

    flash(color, amount) { this.flashColor = color; this.flashTimer = amount; }

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.t += dt;
      this.update(dt);
      this.draw();
      requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      // 발사체
      for (let i = this.shots.length - 1; i >= 0; i--) {
        const s = this.shots[i];
        s.t += dt;
        s.x += (s.tx - s.x) * Math.min(1, dt / (s.dur * 0.7 + 0.0001));
        s.y += (s.ty - s.y) * Math.min(1, dt / (s.dur * 0.7 + 0.0001));
        if (s.t >= s.dur) { this.shots.splice(i, 1); this.resolveShot(s); }
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.vy += 620 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.pops.length - 1; i >= 0; i--) {
        const p = this.pops[i];
        p.life -= dt; p.y -= 34 * dt;
        if (p.life <= 0) this.pops.splice(i, 1);
      }
      this.blocks.forEach((b) => {
        if (b.breaking > 0) b.breaking = Math.max(0, b.breaking - dt);
        if (b.shakeT > 0) b.shakeT = Math.max(0, b.shakeT - dt);
      });
      this.shake = Math.max(0, this.shake - dt * 34);
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }

    /* ── 그리기 ── */
    draw() {
      const ctx = this.ctx, W = this.W, H = this.H;
      ctx.save();
      if (this.shake > 0.2) {
        ctx.translate(rnd(-this.shake, this.shake) * 0.6, rnd(-this.shake, this.shake) * 0.6);
      }
      // 배경
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#151a3d'); g.addColorStop(0.55, '#1d2450'); g.addColorStop(1, '#261a3d');
      ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
      this.drawStars(ctx);
      // 격자
      ctx.strokeStyle = 'rgba(124,231,200,0.07)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      this.blocks.forEach((b) => { if (b.alive) this.drawBlock(ctx, b); });
      this.drawCannons(ctx);
      // 발사체
      this.shots.forEach((s) => {
        ctx.fillStyle = s.side === 'c' ? '#ff8fa3' : s.side === 'p' ? '#ffe066' : '#7ce7c8';
        ctx.fillRect(s.x - 6, s.y - 6, 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      });
      // 파티클
      this.particles.forEach((p) => {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        ctx.globalAlpha = 1;
      });
      // 점수 팝업
      ctx.textAlign = 'center';
      this.pops.forEach((p) => {
        ctx.globalAlpha = Math.min(1, p.life * 1.6);
        ctx.font = 'bold 15px "Galmuri11","Malgun Gothic",sans-serif';
        ctx.fillStyle = '#101426';
        ctx.fillText(p.text, p.x + 1, p.y - 1);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
      });
      ctx.restore();

      if (this.flashTimer > 0) {
        ctx.globalAlpha = Math.min(0.5, this.flashTimer * 4);
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    drawStars(ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 26; i++) {
        const x = (i * 137.5) % this.W;
        const y = (i * 89.3 + this.t * (8 + (i % 5) * 4)) % this.H;
        const s = i % 4 === 0 ? 3 : 2;
        ctx.globalAlpha = 0.15 + ((i % 5) / 10);
        ctx.fillRect(Math.round(x), Math.round(y), s, s);
      }
      ctx.globalAlpha = 1;
    }

    drawBlock(ctx, b) {
      const bob = Math.sin(this.t * 2 + b.id) * 1.2;
      let x = b.x, y = b.y + bob;
      if (b.shakeT > 0) x += Math.sin(b.shakeT * 90) * 5;
      const w = b.w, h = b.h;
      const isPick = b.kind === 'pick';
      const isAmount = b.kind === 'amount';
      // 색으로 정답을 알 수 없도록, 같은 라운드의 블록은 모두 같은 색을 쓴다
      const palette = isPick
        ? { base: '#4d4290', light: '#6e60c4', dark: '#2c2456', border: '#1d1740' }
        : isAmount
          ? { base: '#2f5a86', light: '#4a7fbc', dark: '#1b3552', border: '#122539' }
          : { base: '#2c6a72', light: '#4c9aa0', dark: '#173f46', border: '#0f2b30' };
      const base = palette.base, light = palette.light, dark = palette.dark, border = palette.border;

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.round(x) + 3, Math.round(y) + 4, w, h);
      ctx.fillStyle = border;
      ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, w + 4, h + 4);
      ctx.fillStyle = base;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
      // 베벨
      ctx.fillStyle = light;
      ctx.fillRect(Math.round(x), Math.round(y), w, 3);
      ctx.fillRect(Math.round(x), Math.round(y), 3, h);
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(x), Math.round(y) + h - 3, w, 3);
      ctx.fillRect(Math.round(x) + w - 3, Math.round(y), 3, h);
      // 도트 텍스처
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 6; i < w - 6; i += 8) for (let j = 8; j < h - 8; j += 8) ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 2, 2);

      // 글자
      const label = b.label;
      const maxW = w - 10;
      let size = label.length > 8 ? 12 : label.length > 6 ? 13 : 15;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let lines = [label];
      if (label.length > 5 && !isAmount) {
        const mid = Math.ceil(label.length / 2);
        lines = [label.slice(0, mid), label.slice(mid)];
      }
      if (isAmount) { lines = [label]; size = label.length > 8 ? 13 : 15; }
      while (size > 9) {
        ctx.font = 'bold ' + size + 'px "Galmuri11","Malgun Gothic",sans-serif';
        const widest = Math.max.apply(null, lines.map((l) => ctx.measureText(l).width));
        if (widest <= maxW) break;
        size -= 1;
      }
      ctx.font = 'bold ' + size + 'px "Galmuri11","Malgun Gothic",sans-serif';
      const lh = size + 2;
      lines.forEach((ln, i) => {
        const ty = y + h / 2 + (i - (lines.length - 1) / 2) * lh;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(ln, x + w / 2 + 1, ty + 1);
        ctx.fillStyle = '#f4fbff';
        ctx.fillText(ln, x + w / 2, ty);
      });
    }

    drawCannons(ctx) {
      const H = this.H, W = this.W;
      // 바닥
      ctx.fillStyle = '#0f1226';
      ctx.fillRect(0, H - 52, W, 52);
      ctx.fillStyle = 'rgba(124,231,200,0.14)';
      ctx.fillRect(0, H - 52, W, 2);
      const sides = [{ k: 'd', c: '#7ce7c8', l: '차변' }, { k: 'c', c: '#ff8fa3', l: '대변' }];
      if (this.stage && this.stage.mode === 'pick') sides.push({ k: 'p', c: '#ffe066', l: '정답' });
      sides.forEach((s) => {
        const active = this.side === s.k;
        const m = this.muzzle[s.k];
        const bx = m.x, by = H - 34;
        ctx.save();
        ctx.translate(bx, by);
        // 포신
        ctx.fillStyle = '#0a0d1c';
        ctx.fillRect(-13, -30, 26, 34);
        ctx.fillStyle = active ? s.c : '#4b5170';
        ctx.fillRect(-10, -27, 20, 28);
        ctx.fillStyle = active ? '#ffffff' : '#787f9e';
        ctx.fillRect(-10, -27, 20, 3);
        ctx.fillRect(-4, -34, 8, 8);
        // 받침
        ctx.fillStyle = '#0a0d1c';
        ctx.fillRect(-20, 2, 40, 12);
        ctx.fillStyle = active ? s.c : '#3a3f5c';
        ctx.fillRect(-17, 4, 34, 8);
        if (active) {
          ctx.globalAlpha = 0.35 + Math.sin(this.t * 8) * 0.15;
          ctx.fillStyle = s.c;
          ctx.fillRect(-24, -40, 48, 46);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // 라벨
        ctx.font = 'bold 11px "Galmuri11","Malgun Gothic",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = active ? s.c : '#6b7290';
        ctx.fillText(s.l, bx, H - 8);
      });
      // 조준선
      if (this.side !== 'p') {
        const m = this.muzzle[this.side];
        ctx.strokeStyle = this.side === 'c' ? 'rgba(255,143,163,0.18)' : 'rgba(124,231,200,0.18)';
        ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(m.x, H - 62); ctx.lineTo(m.x, 10); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    /* 모아 스프라이트 그리기 (DOM 캔버스용 정적 헬퍼) */
    static drawSprite(ctx, scale, x, y, colors) {
      const c = colors || MOA_COLORS;
      for (let row = 0; row < MOA.length; row++) {
        for (let col = 0; col < MOA[row].length; col++) {
          const k = MOA[row][col];
          if (k === '.') continue;
          ctx.fillStyle = c[k] || '#000';
          ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
        }
      }
    }
  }

  Engine.won = (n) => Number(n).toLocaleString('ko-KR') + '원';
  root.BlasterEngine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
