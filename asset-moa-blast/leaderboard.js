(function () {
  'use strict';
  const BOARD = {
    url: 'https://tstjreubarmklckjhelv.supabase.co',
    key: 'sb_publishable_F3v2CpBvmOtrrHJkWe-fRw_Ia6hc1cN',
    submit: 'moa_blaster_submit', board: 'moa_blaster_leaderboard', enabled: true
  };
  const key = 'moaBlast.board.v1';
  const retryDelay = 30000;
  let disk = { sent: [], queue: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved?.sent) && Array.isArray(saved.queue)) disk = saved;
  } catch {}
  let status = 'unknown', lastAt = null, cached = [], warned = false;
  let failures = 0, fetching = null, submitting = false, pollTimer, submitTimer, screen, render;
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(disk)); } catch {} };

  function offline() {
    status = 'offline';
    if (!warned) { warned = true; console.warn('[Blast] 온라인 랭킹에 연결하지 못해 이 기기 기록을 표시합니다.'); }
  }

  async function rpc(method, body) {
    if (!BOARD.enabled) return null;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 8000);
    try {
      const result = await fetch(BOARD.url + '/rest/v1/rpc/' + method, {
        method: 'POST', headers: { apikey: BOARD.key, Authorization: 'Bearer ' + BOARD.key,
          'Content-Type': 'application/json' }, signal: abort.signal, body: JSON.stringify(body)
      });
      if (!result.ok) return null;
      return await result.json();
    } catch { return null; }
    finally { clearTimeout(timer); }
  }

  function view() {
    return { mode: status === 'online' ? 'online' : 'local', entries: cached.map(row => ({ ...row })), lastAt };
  }

  function fetchBoard() {
    if (!BOARD.enabled) { status = 'offline'; return Promise.resolve(null); }
    if (fetching) return fetching;
    fetching = rpc(BOARD.board, {}).then(rows => {
      if (!Array.isArray(rows)) { failures++; offline(); return null; }
      status = 'online';
      failures = 0;
      lastAt = Date.now();
      cached = rows.filter(row => typeof row?.nickname === 'string' && Number.isFinite(row.best_score)).slice(0, 20);
      return cached.map(row => ({ ...row }));
    }).finally(() => { fetching = null; });
    return fetching;
  }

  async function submit(record) {
    const response = await rpc(BOARD.submit, {
      p_nickname: record.nickname, p_best_score: record.best, p_cleared_stages: record.cleared, p_best_combo: record.combo
    });
    if (response === true) return true;
    if (response === null && BOARD.enabled) offline();
    return false;
  }

  function deferSubmit() {
    clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      submitTimer = undefined;
      void flush();
    }, 2000);
  }

  async function flush() {
    if (!BOARD.enabled || submitting || document.visibilityState !== 'visible' || navigator.onLine === false) return;
    const now = Date.now();
    const record = disk.queue.find(row => now >= (row.retryAt || 0));
    if (!record) return;
    submitting = true;
    const ok = await submit(record);
    submitting = false;
    const current = disk.queue.find(row => row.nickname === record.nickname);
    if (ok) {
      disk.sent = disk.sent.filter(row => row.nickname !== record.nickname).concat(record).slice(-30);
      disk.queue = disk.queue.filter(row => row.nickname !== record.nickname || row.best > record.best);
    } else if (current) {
      current.retryAt = Date.now() + retryDelay;
    }
    persist();
    render?.();
    if (ok && eligible()) void refresh();
    if (ok && disk.queue.some(row => Date.now() >= (row.retryAt || 0))) {
      deferSubmit();
    }
  }

  function schedule(record) {
    if (!record.nickname || !BOARD.enabled) return;
    const sent = disk.sent.find(row => row.nickname === record.nickname);
    const pending = disk.queue.find(row => row.nickname === record.nickname);
    if (record.best <= (sent?.best ?? -1) || record.best <= (pending?.best ?? -1)) return;
    disk.queue = disk.queue.filter(row => row.nickname !== record.nickname)
      .concat({ ...record, retryAt: pending?.retryAt || 0 }).slice(-5);
    persist();
    deferSubmit();
  }

  function eligible() {
    return BOARD.enabled && document.visibilityState === 'visible' &&
      (screen === 'screen-home' || screen === 'screen-rank');
  }

  let refreshing = false;
  async function refresh() {
    clearTimeout(pollTimer);
    if (!eligible() || refreshing) return;
    refreshing = true;
    await fetchBoard();
    refreshing = false;
    render?.();
    if (eligible()) pollTimer = setTimeout(refresh, failures >= 3 ? 60000 : screen === 'screen-rank' ? 10000 : 15000);
  }

  function activate(next, callback) {
    const returned = screen !== next;
    screen = next;
    render = callback;
    render?.();
    void refresh();
    if (returned && eligible() && disk.queue.length && submitTimer === undefined) deferSubmit();
  }

  function resume() {
    if (document.visibilityState !== 'visible') { clearTimeout(pollTimer); return; }
    void refresh();
    if (eligible() && disk.queue.length && submitTimer === undefined) deferSubmit();
  }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('online', resume);
  window.BlastBoard = Object.freeze({ submit, fetch: fetchBoard, status: () => status, lastAt: () => lastAt,
    view, schedule, activate });
})();
