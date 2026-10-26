/* HKDSE 溫習測驗 · 主程式
 * 題庫：js/data.js（window.QBANK）
 * 紀錄：localStorage（僅存於使用者自己的瀏覽器）
 */
(function () {
  'use strict';

  const QB = Array.isArray(window.QBANK) ? window.QBANK : [];
  const $ = (s, r = document) => r.querySelector(s);
  const HKEY = 'dse_hist_v1';
  const SKEY = 'dse_settings_v1';

  /* ---------- 工具 ---------- */
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === false || v == null) continue;
        if (typeof v === 'function') n.addEventListener(k.slice(2), v);
        else if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else n.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return n;
  }

  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無法儲存時仍可測驗 */ } }
  };

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const BY_ID = {};
  QB.forEach(q => { BY_ID[q.id] = q; });
  const REAL_N = QB.filter(q => q.type === 'real').length;
  const FUNC_N = QB.length - REAL_N;

  const defaults = { count: 10, range: 'all', mode: 'random', immediate: true, shuffleOpts: true };
  let settings = Object.assign({}, defaults, store.get(SKEY, {}));
  const saveSettings = () => store.set(SKEY, settings);

  const hist = () => store.get(HKEY, {});
  const saveHist = x => store.set(HKEY, x);
  const wrongIds = () => { const hh = hist(); return Object.keys(hh).filter(id => hh[id].pending && BY_ID[id]); };

  function recordAnswer(id, ok) {
    const hh = hist();
    const e = hh[id] || { w: 0, c: 0, pending: false, last: 0 };
    if (ok) { e.c += 1; e.pending = false; }          // 答對即自動移出錯題清單
    else { e.w += 1; e.pending = true; e.last = Date.now(); }
    hh[id] = e;
    saveHist(hh);
  }

  function rangeFilter(range) {
    return QB.filter(q => range === 'all' || (range === 'real' && q.type === 'real') || (range === 'func' && q.type === 'func'));
  }

  function sentenceEl(q) {
    const s = q.sentence;
    const [i, l] = q.hl;
    if (i < 0) return h('p', { class: 'sentence', text: s });
    return h('p', { class: 'sentence' }, s.slice(0, i), h('mark', { text: s.slice(i, i + l) }), s.slice(i + l));
  }

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- 開始選單資料 ---------- */
  const SUBJECTS = [
    { id: 'zh', name: '中文', icon: 'icons/chinese.svg', ready: true },
    { id: 'en', name: '英文', icon: 'icons/english.svg' },
    { id: 'math', name: '數學', icon: 'icons/math.svg' },
    { id: 'phy', name: '物理', icon: 'icons/physics.svg' },
    { id: 'chem', name: '化學', icon: 'icons/chemistry.svg' },
    { id: 'bio', name: '生物', icon: 'icons/biology.svg' }
  ];
  const CHILDREN = {
    zh: [
      { id: 'lianpo', name: '《廉頗藺相如傳》', icon: 'icons/book.svg', ready: true },
      { id: 'yueyang', name: '《岳陽樓記》', icon: 'icons/book.svg' },
      { id: 'chibi', name: '《赤壁賦》', icon: 'icons/book.svg' }
    ],
    lianpo: [
      { id: 'vocab', name: '文言字詞', icon: 'icons/vocab.svg', ready: true },
      { id: 'qa', name: '課文問答', icon: 'icons/qa.svg' }
    ]
  };
  const LABELS = { zh: '中文 · 指定範文', lianpo: '《廉頗藺相如傳》' };

  let path = [];

  function renderStartLeft() {
    const list = $('#sm-list');
    const title = $('#sm-title');
    list.textContent = '';
    const last = path[path.length - 1];
    title.textContent = last ? LABELS[last] : '所有科目';
    const q = ($('#sm-search').value || '').trim();

    if (path.length) {
      list.append(h('button', { class: 'sm-item back', type: 'button', onclick: () => { path.pop(); renderStartLeft(); } },
        h('span', { class: 'arrow', 'aria-hidden': 'true', text: '‹' }), h('span', { class: 'name', text: '返回' })));
    }
    const items = path.length ? (CHILDREN[last] || []) : SUBJECTS;
    items
      .filter(it => !q || it.name.includes(q))
      .forEach(it => {
        const hasChild = !!CHILDREN[it.id];
        list.append(h('button', {
          class: 'sm-item' + (it.ready ? '' : ' soon'), type: 'button',
          onclick: () => chooseItem(it)
        },
          h('img', { src: it.icon, alt: '', width: 34, height: 34 }),
          h('span', { class: 'name', text: it.name }),
          hasChild ? h('span', { class: 'arrow', 'aria-hidden': 'true', text: '›' })
            : (it.ready ? null : h('span', { class: 'tag', text: '即將推出' }))
        ));
      });
    if (!items.some(it => !q || it.name.includes(q))) {
      list.append(h('p', { class: 'muted', style: 'padding:8px 10px', text: '找不到符合的項目。' }));
    }
  }

  function chooseItem(it) {
    if (!it.ready) { toast(`「${it.name}」即將推出`); return; }
    if (CHILDREN[it.id]) { path.push(it.id); $('#sm-search').value = ''; renderStartLeft(); return; }
    if (it.id === 'vocab') { closeStart(); openSetup(); }
  }

  function openStart() {
    path = [];
    $('#sm-search').value = '';
    renderStartLeft();
    $('#start-menu').classList.remove('hidden');
    $('#start-orb').setAttribute('aria-expanded', 'true');
  }
  function closeStart() {
    $('#start-menu').classList.add('hidden');
    $('#start-orb').setAttribute('aria-expanded', 'false');
  }
  function toggleStart() {
    $('#start-menu').classList.contains('hidden') ? openStart() : closeStart();
  }

  /* ---------- 視窗與工作列 ---------- */
  let winEl = null;
  let curBody = null;
  let winTitle = '';
  let winIcon = '';
  let curView = null;  // 'setup' | 'quiz' | 'result' | 'review' | 'records' | 'help'

  function setTask() {
    const box = $('#task-items');
    box.textContent = '';
    if (!winEl) return;
    box.append(h('button', { class: 'task active', type: 'button', onclick: () => winEl && winEl.classList.toggle('hidden') },
      h('img', { src: winIcon, alt: '' }), h('span', { text: winTitle })));
  }

  function setWinTitle(title, icon) {
    winTitle = title;
    if (icon) winIcon = icon;
    if (winEl) {
      winEl.querySelector('.title span').textContent = title;
      winEl.querySelector('.title img').src = winIcon;
      winEl.setAttribute('aria-label', title);
    }
    setTask();
  }

  function openWindow(title, icon, view, build) {
    if (winEl && Q && !Q.done && curView === 'quiz') {
      if (!confirm('離開將放棄本次測驗的進度，確定要離開嗎？')) return;
    }
    Q = null;
    closeWindow(true);
    const body = h('div', { class: 'content' });
    winEl = h('section', { id: 'window', role: 'dialog', 'aria-label': title },
      h('div', { class: 'title' },
        h('img', { src: icon, alt: '' }),
        h('span', { text: title }),
        h('button', { class: 'win-x', type: 'button', 'aria-label': '關閉視窗', onclick: () => closeWindow() }, '✕')),
      body);
    document.body.append(winEl);
    winTitle = title; winIcon = icon; curView = view; curBody = body;
    document.body.classList.add('win-open');
    setTask();
    build(body);
    body.scrollTop = 0;
    const first = winEl.querySelector('.content button, .content input');
    if (first) first.focus({ preventScroll: true });
  }

  function closeWindow(silent) {
    if (!silent && winEl && Q && !Q.done && curView === 'quiz') {
      if (!confirm('離開將放棄本次測驗的進度，確定要離開嗎？')) return;
    }
    if (winEl) winEl.remove();
    winEl = null; curBody = null; curView = null; Q = null;
    document.body.classList.remove('win-open');
    setTask();
  }

  /* ---------- 測驗設定 ---------- */
  function openSetup() {
    openWindow('文言字詞測驗 · 《廉頗藺相如傳》', 'icons/vocab.svg', 'setup', body => renderSetup(body));
  }

  function renderSetup(body) {
    curBody = body; curView = 'setup';
    setWinTitle('文言字詞測驗 · 《廉頗藺相如傳》');
    body.textContent = '';
    const wrong = wrongIds().length;
    const s = settings;

    const seg = (label, key, opts) => h('div', { class: 'group' },
      h('h3', { text: label }),
      h('div', { class: 'seg', role: 'group', 'aria-label': label },
        opts.map(([v, t]) => h('button', {
          type: 'button', 'aria-pressed': String(s[key] === v),
          onclick: () => { s[key] = v; saveSettings(); renderSetup(body); }
        }, t))));

    const toggle = (key, text) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!s[key], onchange: e => { s[key] = e.target.checked; saveSettings(); } }),
      h('span', { text }));

    body.append(
      h('p', { class: 'intro', text: `題庫共 ${QB.length} 題（實詞 ${REAL_N} 題／虛詞 ${FUNC_N} 題）。目前錯題 ${wrong} 題。` }),
      seg('題目數量', 'count', [[5, '5 題'], [10, '10 題'], [15, '15 題'], [20, '20 題']]),
      seg('題目範圍', 'range', [['all', '全部'], ['real', '實詞'], ['func', '虛詞']]),
      seg('出題方式', 'mode', [['random', '隨機出題'], ['mix', '加入以往錯題'], ['wrong', '只練錯題']]),
      h('div', { class: 'group' },
        h('h3', { text: '其他選項' }),
        toggle('immediate', '作答後即時顯示答案與解釋'),
        toggle('shuffleOpts', '隨機排列選項次序')),
      h('p', { class: 'muted', text: '「加入以往錯題」會從錯題清單中抽取最多一半題目；答對一次即自動移出錯題清單。' }),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => startQuiz() }, '開始測驗'),
        h('button', { class: 'btn', type: 'button', onclick: () => openReview() }, '錯題檢討')));
  }

  /* ---------- 測驗引擎 ---------- */
  let Q = null; // { items, i, score, log, answered, s, notice, done }

  function buildPicks(s) {
    const pool = rangeFilter(s.range);
    const n = Math.min(s.count, pool.length);
    const hh = hist();
    const isWrong = id => !!(hh[id] && hh[id].pending);
    const wrong = shuffle(pool.filter(q => isWrong(q.id)));
    const fresh = shuffle(pool.filter(q => !isWrong(q.id)));
    let picks; let notice = '';

    if (s.mode === 'wrong') {
      if (!wrong.length) {
        notice = '目前沒有錯題，已改為隨機出題。';
        picks = shuffle(pool).slice(0, n);
      } else {
        picks = wrong.slice(0, n);
        if (picks.length < n) {
          notice = `錯題只有 ${wrong.length} 題，已補充其他題目。`;
          picks = picks.concat(fresh.slice(0, n - picks.length));
        }
      }
    } else if (s.mode === 'mix') {
      if (!wrong.length) notice = '暫時沒有錯題，已隨機出題。';
      const k = Math.min(wrong.length, Math.ceil(n / 2));
      picks = wrong.slice(0, k).concat(fresh.slice(0, n - k));
    } else {
      picks = shuffle(pool).slice(0, n);
    }
    return { items: shuffle(picks), notice };
  }

  function startQuiz(override) {
    const s = Object.assign({}, settings, override || {});
    const { items, notice } = buildPicks(s);
    if (!items.length) { toast('題庫沒有可用題目。'); return; }
    if (!winEl) openWindow('文言字詞測驗 · 《廉頗藺相如傳》', 'icons/vocab.svg', 'quiz', () => {});
    Q = { items, i: 0, score: 0, log: [], answered: false, s, notice, done: false };
    curView = 'quiz';
    setWinTitle('文言字詞測驗 · 《廉頗藺相如傳》', 'icons/vocab.svg');
    renderQuestion();
  }

  function renderQuestion() {
    const body = curBody;
    body.textContent = '';
    const total = Q.items.length;
    const q = Q.items[Q.i];

    if (Q.i === 0 && Q.notice) body.append(h('p', { class: 'notice', text: Q.notice }));
    body.append(
      h('div', { class: 'qhead' },
        h('span', { text: `第 ${Q.i + 1} / ${total} 題` }),
        h('span', { class: 'grow' }),
        h('span', { class: 'muted', text: `得分 ${Q.score}` })),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': Q.i },
        h('i', { style: `width:${(Q.i / total * 100).toFixed(1)}%` })),
      h('div', { class: 'card' },
        h('p', { class: 'stem', text: q.type === 'real' ? '下列句子中，標示字詞的意思最接近哪一項？' : '下列句子中，標示字詞的詞性及用法是？' }),
        sentenceEl(q)));

    const order = Q.s.shuffleOpts ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i);
    const list = h('div', { class: 'opts', role: 'group', 'aria-label': '答案選項' });
    order.forEach((orig, pos) => {
      list.append(h('button', { class: 'opt', type: 'button', 'data-orig': orig, onclick: () => answer(orig, list) },
        h('span', { class: 'k', 'aria-hidden': 'true', text: String(pos + 1) }),
        h('span', { text: q.options[orig] })));
    });
    body.append(list, h('div', { class: 'feedback', 'aria-live': 'polite' }));
  }

  function answer(orig, list) {
    if (!Q || Q.answered || Q.done) return;
    Q.answered = true;
    const q = Q.items[Q.i];
    const ok = orig === q.answer;
    if (ok) Q.score += 1;
    recordAnswer(q.id, ok);
    Q.log.push({ q, ok, chosen: q.options[orig], correct: q.options[q.answer] });

    if (!Q.s.immediate) { nextQ(); return; }

    list.querySelectorAll('.opt').forEach(b => {
      b.disabled = true;
      const o = Number(b.dataset.orig);
      if (o === q.answer) b.classList.add('right');
      else if (o === orig) b.classList.add('wrong');
    });
    const total = Q.items.length;
    const fb = curBody.querySelector('.feedback');
    fb.append(
      h('p', { class: ok ? 'good' : 'bad', text: ok ? '答對了！' : `答錯了。正確答案：${q.options[q.answer]}` }),
      h('p', { class: 'explain', text: q.explain }),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: nextQ, id: 'next-btn' },
          Q.i + 1 < total ? '下一題 →' : '查看結果')));
    const nb = curBody.querySelector('#next-btn');
    if (nb) nb.focus({ preventScroll: true });
  }

  function nextQ() {
    if (!Q) return;
    Q.i += 1;
    Q.answered = false;
    if (Q.i >= Q.items.length) { renderResult(); return; }
    renderQuestion();
  }

  function renderResult() {
    Q.done = true;
    curView = 'result';
    const body = curBody;
    body.textContent = '';
    const total = Q.items.length;
    const pct = Math.round(Q.score / total * 100);
    const wrong = Q.log.filter(x => !x.ok);
    const tip = pct >= 80 ? '做得很好！' : pct >= 50 ? '繼續努力，錯題已記錄。' : '別灰心，錯題已加入錯題清單，多加練習。';

    body.append(
      h('div', { class: 'result' },
        h('div', { class: 'score', text: `${Q.score} / ${total}` }),
        h('div', { class: 'muted', text: `正確率 ${pct}%　·　${tip}` })),
      wrong.length
        ? h('h3', { text: `答錯的題目（${wrong.length}）` })
        : h('p', { class: 'good', text: '全部答對！' }),
      wrong.map(x => h('div', { class: 'card wrongcard' },
        sentenceEl(x.q),
        h('p', { class: 'bad', text: `你的答案：${x.chosen}` }),
        h('p', { class: 'good', text: `正確答案：${x.correct}` }),
        h('p', { class: 'explain', text: x.q.explain }))),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => startQuiz() }, '再測一次'),
        h('button', { class: 'btn', type: 'button', onclick: () => openReview() }, '錯題檢討'),
        h('button', { class: 'btn', type: 'button', onclick: () => renderSetup(body) }, '返回設定')));
    body.scrollTop = 0;
  }

  /* ---------- 錯題檢討 ---------- */
  function openReview() {
    openWindow('錯題檢討', 'icons/review.svg', 'review', body => renderReview(body));
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleDateString('zh-HK', { year: 'numeric', month: 'numeric', day: 'numeric' }); }
    catch (e) { return new Date(ts).toISOString().slice(0, 10); }
  }

  function renderReview(body) {
    curBody = body; curView = 'review';
    setWinTitle('錯題檢討');
    body.textContent = '';
    const hh = hist();
    const ids = wrongIds().sort((a, b) => (hh[b].last || 0) - (hh[a].last || 0));
    updateBadge(ids.length);

    body.append(
      h('p', { class: 'intro', text: `目前有 ${ids.length} 題錯題。答對一次即自動移出錯題清單，亦可手動移出。` }),
      h('div', { class: 'actions', style: 'margin-top:0' },
        h('button', { class: 'btn primary', type: 'button', disabled: !ids.length,
          onclick: () => startQuiz({ mode: 'wrong', range: 'all' }) }, '以錯題開始測驗'),
        h('button', { class: 'btn danger', type: 'button', disabled: !ids.length,
          onclick: () => { if (confirm('確定清除全部錯題紀錄？')) { const x = hist(); ids.forEach(id => { if (x[id]) x[id].pending = false; }); saveHist(x); renderReview(body); } } },
          '清除全部錯題')),
      h('div', { style: 'height:12px' }));

    if (!ids.length) {
      body.append(h('div', { class: 'empty', text: '暫時沒有錯題。完成測驗後，答錯的題目會自動記錄在這裡。' }));
      return;
    }
    ids.forEach(id => {
      const q = BY_ID[id]; const e = hh[id];
      body.append(h('div', { class: 'card wrongcard' },
        sentenceEl(q),
        h('p', { class: 'good', text: `正確答案：${q.options[q.answer]}` }),
        h('p', { class: 'explain', text: q.explain }),
        h('p', { class: 'meta muted', text: `答錯 ${e.w} 次・答對 ${e.c} 次・最近答錯：${fmtDate(e.last)}` }),
        h('div', { class: 'actions', style: 'margin-top:10px' },
          h('button', { class: 'btn small', type: 'button', onclick: () => {
            const x = hist(); if (x[id]) x[id].pending = false; saveHist(x); renderReview(body);
          } }, '已掌握，移出錯題'))));
    });
  }

  function updateBadge(n) {
    const b = $('#wrong-badge');
    b.textContent = String(n);
    b.classList.toggle('hidden', !n);
  }

  /* ---------- 學習紀錄與說明 ---------- */
  function openRecords() {
    openWindow('學習紀錄', 'icons/records.svg', 'records', body => renderRecords(body));
  }

  function renderRecords(body) {
    curBody = body; curView = 'records';
    setWinTitle('學習紀錄');
    body.textContent = '';
    const hh = hist();
    const vals = Object.values(hh);
    const answered = vals.reduce((a, e) => a + e.c + e.w, 0);
    const correct = vals.reduce((a, e) => a + e.c, 0);
    const acc = answered ? Math.round(correct / answered * 100) : 0;
    body.append(
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', { text: String(answered) }), h('span', { text: '累計作答' })),
        h('div', { class: 'stat' }, h('b', { text: `${acc}%` }), h('span', { text: '整體正確率' })),
        h('div', { class: 'stat' }, h('b', { text: String(wrongIds().length) }), h('span', { text: '目前錯題' }))),
      h('p', { class: 'muted', text: '紀錄只儲存於此瀏覽器，清除瀏覽器資料時會一併消失。' }),
      h('div', { class: 'actions' },
        h('button', { class: 'btn danger', type: 'button', onclick: () => {
          if (confirm('確定重設所有學習紀錄？此操作無法復原。')) { saveHist({}); updateBadge(0); renderRecords(body); }
        } }, '重設所有紀錄')));
    updateBadge(wrongIds().length);
  }

  function openHelp() {
    openWindow('使用說明', 'icons/help.svg', 'help', body => {
      curBody = body; body.className = 'content help';
      body.append(
        h('h3', { text: '如何開始測驗' }),
        h('p', { text: '1. 點擊左下角「開始」按鈕。2. 選擇「中文」，再選擇「《廉頗藺相如傳》」。3. 選擇「文言字詞」，設定題目數量、範圍與出題方式，然後按「開始測驗」。' }),
        h('h3', { text: '錯題檢討' }),
        h('p', { text: '答錯的題目會自動記錄。測驗之後可在「錯題檢討」查看答錯的題目，之後亦可在出題方式選擇「加入以往錯題」或「只練錯題」再次練習。答對一次即會移出錯題清單。' }),
        h('h3', { text: '鍵盤操作' }),
        h('p', { text: '作答時可按數字鍵 1 至 4 選擇選項；答案顯示後按 Enter 進入下一題。按 Esc 可關閉開始選單或視窗。' }));
    });
  }

  /* ---------- 初始化與事件 ---------- */
  function tickClock() {
    const d = new Date();
    $('#clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function init() {
    if (!QB.length) toast('題庫載入失敗，請確認 js/data.js 已存在。');
    tickClock(); setInterval(tickClock, 15000);
    updateBadge(wrongIds().length);

    $('#start-orb').addEventListener('click', e => { e.stopPropagation(); toggleStart(); });
    $('#btn-desktop').addEventListener('click', closeStart);
    $('#sm-search').addEventListener('input', renderStartLeft);

    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
      closeStart();
      const go = b.dataset.go;
      if (go === 'review') openReview();
      else if (go === 'records') openRecords();
      else if (go === 'help') openHelp();
    }));

    document.addEventListener('click', e => {
      const menu = $('#start-menu');
      if (menu.classList.contains('hidden')) return;
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(menu) && !path.includes($('#start-orb'))) closeStart();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$('#start-menu').classList.contains('hidden')) { closeStart(); return; }
        if (winEl && curView !== 'quiz') closeWindow();
        return;
      }
      if (!Q || Q.done || curView !== 'quiz' || !winEl) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (/^[1-4]$/.test(e.key) && !Q.answered) {
        const btns = [...curBody.querySelectorAll('.opt')];
        const b = btns[Number(e.key) - 1];
        if (b && !b.disabled) b.click();
      } else if (e.key === 'Enter' && Q.answered && e.target.tagName !== 'BUTTON') {
        nextQ();
      }
    });
  }

  // 讓「學習紀錄」「錯題」之類的入口可以由其他地方呼叫
  window.DSE = { openSetup, openReview, openRecords, openHelp };

  init();
})();
