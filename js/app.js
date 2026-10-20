/* 考研单词查阅网站 —— 前端逻辑
   数据：data/words.js (window.KY_WORDS)、data/progress.js (window.KY_DONE)、
        data/detail/detail-NNN.js (window.KY_CHUNKS[NNN]) */
(function () {
  'use strict';

  var WORDS = window.KY_WORDS || [];
  var DONE = {}; (window.KY_DONE || []).forEach(function (id) { DONE[id] = 1; });
  var CHUNKS = (window.KY_CHUNKS = window.KY_CHUNKS || {});
  var BATCH_SIZE = 20;
  var KAOYAN_COUNT = window.KY_KAOYAN_COUNT || WORDS.length;
  var KAOYAN_BATCHES = Math.ceil(KAOYAN_COUNT / BATCH_SIZE);
  var PAGE = 200;

  var FAV_KEY = 'ky_fav_v1';
  var MAS_KEY = 'ky_mastered_v1';

  var fav = loadSet(FAV_KEY);
  var mastered = loadSet(MAS_KEY);

  var state = {
    q: '', letter: '', pos: '', favOnly: false, hideMastered: false,
    sort: 'abc', shown: PAGE, current: null
  };

  var POS_NAME = {
    n: '名词 n.', v: '动词 v.', adj: '形容词 adj.', adv: '副词 adv.',
    prep: '介词 prep.', conj: '连词 conj.', pron: '代词 pron.',
    num: '数词 num.', int: '感叹词 int.', art: '冠词 art.'
  };
  var POS_ORDER = ['n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'num', 'int', 'art'];

  /* ---------------- 预处理 ---------------- */
  function loadSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (e) { return new Set(); }
  }
  function saveSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) { }
  }

  function posOf(item) {
    var set = {};
    item.t.forEach(function (s) {
      var m = s.match(/(^|[\s(（\[；;,])(n|v|vt|vi|adj|adv|prep|conj|pron|num|int|art|interj|aux)\s*\./gi);
      if (m) {
        m.forEach(function (x) {
          var p = x.replace(/[^a-z]/gi, '').toLowerCase();
          if (p === 'vt' || p === 'vi' || p === 'aux') p = 'v';
          if (p === 'interj') p = 'int';
          if (POS_ORDER.indexOf(p) >= 0) set[p] = 1;
        });
      }
    });
    return Object.keys(set);
  }

  var ITEMS = WORDS.map(function (x, i) {
    return {
      w: x.w, t: x.t, i: i, lower: x.w.toLowerCase(),
      letter: (x.w[0] || '#').toLowerCase(),
      pos: posOf(x),
      hay: x.t.join(' ')
    };
  });

  var letterCount = {}, posCount = {};
  ITEMS.forEach(function (it) {
    var L = /[a-z]/.test(it.letter) ? it.letter : '#';
    letterCount[L] = (letterCount[L] || 0) + 1;
    it.pos.forEach(function (p) { posCount[p] = (posCount[p] || 0) + 1; });
  });

  /* ---------------- 侧栏 ---------------- */
  function buildLetters() {
    var box = document.getElementById('letters');
    var letters = Object.keys(letterCount).sort(function (a, b) {
      if (a === '#') return 1; if (b === '#') return -1; return a < b ? -1 : 1;
    });
    var html = '<button data-l="" class="on">全部</button>';
    letters.forEach(function (L) {
      html += '<button data-l="' + L + '">' + L.toUpperCase() + '</button>';
    });
    box.innerHTML = html;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.letter = b.dataset.l; state.shown = PAGE;
      Array.prototype.forEach.call(box.children, function (c) { c.classList.toggle('on', c === b); });
      render();
    });
  }

  function buildPos() {
    var box = document.getElementById('posFilter');
    var html = '<button data-p="" class="on"><span>全部词性</span><span class="cnt">' + ITEMS.length + '</span></button>';
    POS_ORDER.forEach(function (p) {
      if (!posCount[p]) return;
      html += '<button data-p="' + p + '"><span>' + POS_NAME[p] + '</span><span class="cnt">' + posCount[p] + '</span></button>';
    });
    box.innerHTML = html;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.pos = b.dataset.p; state.shown = PAGE;
      Array.prototype.forEach.call(box.children, function (c) { c.classList.toggle('on', c === b); });
      render();
    });
  }

  /* ---------------- 过滤 ---------------- */
  function filtered() {
    var q = state.q.trim().toLowerCase();
    var cjk = /[\u4e00-\u9fa5]/.test(q);
    var out = ITEMS.filter(function (it) {
      if (state.letter && it.letter !== state.letter) return false;
      if (state.pos && it.pos.indexOf(state.pos) < 0) return false;
      if (state.favOnly && !fav.has(it.w)) return false;
      if (state.hideMastered && mastered.has(it.w)) return false;
      if (q) {
        if (cjk) { if (it.hay.toLowerCase().indexOf(q) < 0) return false; }
        else if (it.lower.indexOf(q) < 0) return false;
      }
      return true;
    });
    if (state.sort === 'len') {
      out.sort(function (a, b) { return a.w.length - b.w.length || (a.lower < b.lower ? -1 : 1); });
    } else if (q && !cjk) {
      out.sort(function (a, b) {
        var ra = a.lower.indexOf(q) === 0 ? 0 : 1, rb = b.lower.indexOf(q) === 0 ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return a.w.length - b.w.length || (a.lower < b.lower ? -1 : 1);
      });
    }
    return out;
  }

  /* ---------------- 列表渲染 ---------------- */
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  function chunkOf(index) {
    if (index < KAOYAN_COUNT) return Math.floor(index / BATCH_SIZE) + 1;
    return KAOYAN_BATCHES + Math.floor((index - KAOYAN_COUNT) / BATCH_SIZE) + 1;
  }

  function render() {
    var list = filtered();
    var box = document.getElementById('list');
    var more = document.getElementById('listMore');
    var empty = document.getElementById('empty');

    document.getElementById('listInfo').textContent =
      '共 ' + list.length + ' 个词条' + (list.length > state.shown ? '（显示前 ' + state.shown + ' 个）' : '');
    empty.hidden = list.length !== 0;

    var slice = list.slice(0, state.shown);
    var html = '';
    for (var i = 0; i < slice.length; i++) {
      var it = slice[i];
      var deep = DONE[chunkOf(it.i)];
      var marks = '';
      if (fav.has(it.w)) marks += '<span class="tag fav">收藏</span>';
      if (mastered.has(it.w)) marks += '<span class="tag mastered">已掌握</span>';
      if (deep) marks += '<span class="tag deep">详解</span>';
      html += '<div class="row" data-i="' + it.i + '">' +
        '<div class="w">' + esc(it.w) + '</div>' +
        '<div class="t">' + esc(it.t[0] || '') + '</div>' +
        '<div class="marks">' + marks + '</div></div>';
    }
    box.innerHTML = html;

    more.innerHTML = list.length > state.shown
      ? '<button class="more-btn" id="moreBtn">加载更多（还有 ' + (list.length - state.shown) + ' 个）</button>'
      : '';
    var mb = document.getElementById('moreBtn');
    if (mb) mb.addEventListener('click', function () { state.shown += PAGE * 2; render(); });
  }

  document.getElementById('list').addEventListener('click', function (e) {
    var row = e.target.closest('.row'); if (!row) return;
    openDetail(parseInt(row.dataset.i, 10));
  });

  /* ---------------- 详情 ---------------- */
  function loadChunk(id) {
    if (CHUNKS[id]) return Promise.resolve(CHUNKS[id]);
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'data/detail/detail-' + String(id).padStart(3, '0') + '.js';
      s.onload = function () { resolve(CHUNKS[id] || {}); };
      s.onerror = function () { resolve({}); };
      document.head.appendChild(s);
    });
  }

  function posClass(p) {
    p = (p || '').toLowerCase().replace(/[^a-z]/g, '');
    if (p === 'n') return '';
    if (p === 'v' || p === 'vt' || p === 'vi') return 'v';
    if (p === 'adj') return 'adj';
    if (p === 'adv') return 'adv';
    return '';
  }

  function renderDetail(it, d) {
    var html = '<div class="d-head">' +
      '<div class="d-word">' + esc(it.w) + '</div>' +
      '<div class="d-actions">' +
      '<button class="act-btn fav' + (fav.has(it.w) ? ' on' : '') + '" id="btnFav">' + (fav.has(it.w) ? '★ 已收藏' : '☆ 收藏') + '</button>' +
      '<button class="act-btn mastered' + (mastered.has(it.w) ? ' on' : '') + '" id="btnMas">' + (mastered.has(it.w) ? '✓ 已掌握' : '标记已掌握') + '</button>' +
      '<button class="act-btn spk" id="btnSpk" title="朗读单词">🔊</button>' +
      '</div></div>';

    html += '<div class="d-base"><span class="lbl">词典释义</span><ul>';
    it.t.forEach(function (s) { html += '<li>' + esc(s) + '</li>'; });
    html += '</ul></div>';

    if (!d) {
      html += '<div class="pending">该词的「词源 · 引申 · 例句」详解正在生成中，敬请期待。</div>';
      return html;
    }

    if (d.origin || (d.chain && d.chain.length)) {
      html += '<div class="sec"><h3>词源</h3>';
      if (d.origin) html += '<p class="origin">' + esc(d.origin) + '</p>';
      if (d.chain && d.chain.length) {
        html += '<ul class="chain">';
        d.chain.forEach(function (c) { html += '<li>' + esc(c) + '</li>'; });
        html += '</ul>';
      }
      html += '</div>';
    }

    if (d.mnemonic) {
      html += '<div class="sec"><h3>词源背后的逻辑</h3><div class="mnemonic">' + esc(d.mnemonic) + '</div></div>';
    }

    if (d.senses && d.senses.length) {
      html += '<div class="sec"><h3>分开理解</h3>';
      d.senses.forEach(function (s) {
        html += '<div class="sense"><div class="sense-head">' +
          '<span class="sense-pos ' + posClass(s.pos) + '">' + esc(s.pos || '') + '</span>' +
          '<span class="sense-cn">' + esc(s.cn || '') + '</span></div>';
        if (s.examples && s.examples.length) {
          html += '<div class="sense-items">';
          s.examples.forEach(function (e) {
            html += '<div class="eg"><span class="bul">·</span><span class="en">' + esc(e.en || '') +
              '</span><span class="zh">' + esc(e.zh || '') + '</span></div>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    if (d.derived && d.derived.length) {
      html += '<div class="sec"><h3>衍生词</h3><div class="derived">';
      d.derived.forEach(function (x) {
        html += '<div class="d-item"><b>' + esc(x.en || '') + '</b><span>' + esc(x.zh || '') + '</span></div>';
      });
      html += '</div></div>';
    }

    if (d.analogy) {
      html += '<div class="sec"><h3>容易记的类比</h3><div class="analogy">' + esc(d.analogy) + '</div></div>';
    }

    if (d.sentences && d.sentences.length) {
      html += '<div class="sec"><h3>考研例句</h3><ul class="sent-list">';
      d.sentences.forEach(function (s) {
        if (typeof s === 'string') {
          html += '<li><div class="en">' + esc(s) + '</div></li>';
          return;
        }
        html += '<li><div class="en">' + esc(s.en || '') + '</div>' +
          (s.zh ? '<div class="zh">' + esc(s.zh) + '</div>' : '') + '</li>';
      });
      html += '</ul></div>';
    }

    return html;
  }

  function openDetail(index) {
    var it = ITEMS[index]; if (!it) return;
    state.current = index;
    var drawer = document.getElementById('drawer');
    var body = document.getElementById('drawerBody');
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    body.innerHTML = renderDetail(it, null);
    bindDetailButtons(it);
    body.scrollTop = 0;

    loadChunk(chunkOf(index)).then(function (map) {
      if (state.current !== index) return;
      var d = map[it.w] || null;
      body.innerHTML = renderDetail(it, d);
      bindDetailButtons(it);
    });
  }

  function bindDetailButtons(it) {
    var bf = document.getElementById('btnFav');
    if (bf) bf.addEventListener('click', function () {
      if (fav.has(it.w)) fav.delete(it.w); else fav.add(it.w);
      saveSet(FAV_KEY, fav); refreshCounts();
      this.classList.toggle('on', fav.has(it.w));
      this.textContent = fav.has(it.w) ? '★ 已收藏' : '☆ 收藏';
      render();
    });
    var bm = document.getElementById('btnMas');
    if (bm) bm.addEventListener('click', function () {
      if (mastered.has(it.w)) mastered.delete(it.w); else mastered.add(it.w);
      saveSet(MAS_KEY, mastered); refreshCounts();
      this.classList.toggle('on', mastered.has(it.w));
      this.textContent = mastered.has(it.w) ? '✓ 已掌握' : '标记已掌握';
      render();
    });
    var bs = document.getElementById('btnSpk');
    if (bs) bs.addEventListener('click', function () {
      if (!window.speechSynthesis) return;
      var u = new SpeechSynthesisUtterance(it.w);
      u.lang = 'en-US'; u.rate = .9;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
  }

  function closeDetail() {
    state.current = null;
    document.getElementById('drawer').hidden = true;
    document.body.style.overflow = '';
  }

  document.getElementById('drawerClose').addEventListener('click', closeDetail);
  document.querySelector('.drawer-backdrop').addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDetail();
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault(); document.getElementById('search').focus();
    }
  });

  /* ---------------- 搜索与其它控件 ---------------- */
  var timer = null;
  var searchEl = document.getElementById('search');
  var clearEl = document.getElementById('clearSearch');
  searchEl.addEventListener('input', function () {
    clearEl.hidden = !searchEl.value;
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.q = searchEl.value; state.shown = PAGE; render();
    }, 130);
  });
  clearEl.addEventListener('click', function () {
    searchEl.value = ''; clearEl.hidden = true; state.q = ''; state.shown = PAGE; render(); searchEl.focus();
  });
  document.getElementById('sortSel').addEventListener('change', function () {
    state.sort = this.value; render();
  });
  document.getElementById('favOnly').addEventListener('change', function () {
    state.favOnly = this.checked; state.shown = PAGE; render();
  });
  document.getElementById('hideMastered').addEventListener('change', function () {
    state.hideMastered = this.checked; state.shown = PAGE; render();
  });
  document.getElementById('resetProgress').addEventListener('click', function () {
    if (!confirm('确定清空所有收藏和已掌握标记吗？')) return;
    fav = new Set(); mastered = new Set();
    saveSet(FAV_KEY, fav); saveSet(MAS_KEY, mastered);
    refreshCounts(); render();
  });

  function refreshCounts() {
    document.getElementById('favCount').textContent = fav.size;
    document.getElementById('masteredCount').textContent = mastered.size;
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    buildLetters();
    buildPos();
    refreshCounts();
    render();

    var deep = Object.keys(DONE).length * BATCH_SIZE;
    if (deep > ITEMS.length) deep = ITEMS.length;
    document.getElementById('statTotal').textContent = '词条 ' + ITEMS.length;
    document.getElementById('statDeep').textContent = '详解 ' + deep;
    document.getElementById('progressFill').style.width = (deep / ITEMS.length * 100).toFixed(1) + '%';
    document.getElementById('progressText').textContent = deep + ' / ' + ITEMS.length + ' 个词条已生成深度内容';
  }
  init();
})();
