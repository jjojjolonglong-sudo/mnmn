/*!
 * pick.v1.js - 목록에서 하나 고르는 칸을 "타이핑 고르기"로 바꿔 주는 공용 도우미 (mnmn 저장소, 2026-11-22)
 *
 *  원래의 <select>는 그대로 두고(숨김) 그 자리에 글자 칸을 하나 얹어요. 앱의 다른 코드는 예전처럼 select.value를 읽고 쓰면 돼요.
 *   - 타이핑하면 걸러진 목록, ↑↓로 고르기
 *   - 엔터 → 고른 것 / 이름이 같은 것 / 없으면 그 이름으로 새 항목 만들기(create를 준 경우) → 바로 들어감
 *   - Esc → 원래 값으로, 칸을 비우고 나가면 '없음'(빈 값 option이 있을 때)
 *   - select.value를 코드에서 바꾸면 글자 칸도 따라 바뀌어요
 *
 *  쓰는 법:
 *   <script src="https://jjojjolonglong-sudo.github.io/mnmn/pick.v1.js"></script>
 *   Pick.auto('select[name=artist_id]', { create: async (name, sel) => newId });   // 지금·나중에 생기는 칸 모두
 *   Pick.enhance(selectElement, { create, placeholder });                           // 칸 하나만
 *   create는 새 항목의 value(id)를 돌려주면 돼요(실패하면 null). 없으면 새로 만들기는 안 해요.
 */
(function (root) {
  'use strict';
  if (root.Pick) return;
  var D = document, PROTO = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value'),
      IDX = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

  var css = D.createElement('style');
  css.textContent =
    '.pk-in{box-sizing:border-box}' +
    '.pk-ls{position:fixed;z-index:99999;background:#fff;color:#111;border:1px solid #888;box-shadow:0 4px 14px rgba(0,0,0,.18);max-height:240px;overflow:auto;font:inherit;font-size:13px;text-align:left}' +
    '.pk-ls div{padding:6px 9px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}' +
    '.pk-ls div.on{background:#e8f0fe}.pk-ls .pk-nw{color:#1a56db;font-weight:700;border-top:1px solid #eee}.pk-ls .pk-no{color:#888}';
  (D.head || D.documentElement).appendChild(css);

  var list = null, cur = null;
  function closeList() { if (list) { list.remove(); list = null; } cur = null; }
  addEventListener('scroll', function (e) { if (list && !list.contains(e.target)) closeList(); }, true);
  addEventListener('resize', closeList);

  function opts(sel) { return Array.prototype.filter.call(sel.options, function (o) { return !o.disabled && o.value !== '' && !/^__/.test(o.value); }); }
  function emptyOpt(sel) { return Array.prototype.find.call(sel.options, function (o) { return o.value === ''; }); }
  function label(sel) { var o = sel.options[IDX.get.call(sel)]; return o && o.value !== '' && !/^__/.test(o.value) ? o.text.trim() : ''; }

  function enhance(sel, o) {
    if (!sel || sel._pick) return sel && sel._pick;
    o = o || {};
    var inp = D.createElement('input');
    inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.className = (sel.className ? sel.className + ' ' : '') + 'pk-in';
    inp.style.cssText = sel.style.cssText;
    var eo = emptyOpt(sel);
    inp.placeholder = o.placeholder || (sel.getAttribute('data-ph')) || (eo ? eo.text.trim() : '') || '타이핑해서 고르기';
    if (sel.title) inp.title = sel.title;
    if (sel.disabled) inp.disabled = true;
    if (sel.required) { sel.required = false; inp.required = true; }   // 숨긴 칸은 브라우저가 '필수' 검사를 못 해서 글자 칸으로 옮겨요
    if (sel.id) inp.id = sel.id + '-pk';
    sel.style.display = 'none';
    sel.insertAdjacentElement('afterend', inp);
    var sync = function () { inp.value = label(sel); };
    // 코드에서 value를 바꿔도 글자 칸이 따라오게
    Object.defineProperty(sel, 'value', { configurable: true, get: function () { return PROTO.get.call(this); }, set: function (v) { PROTO.set.call(this, v); sync(); } });
    Object.defineProperty(sel, 'selectedIndex', { configurable: true, get: function () { return IDX.get.call(this); }, set: function (v) { IDX.set.call(this, v); sync(); } });
    new MutationObserver(function () { sync(); inp.disabled = sel.disabled; }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    sel.addEventListener('change', sync);
    sync();

    function set(v) {
      PROTO.set.call(sel, v); sync();
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function show() {
      var q = inp.value.trim().toLowerCase(), all = opts(sel), cv = PROTO.get.call(sel);
      var L = all.filter(function (x) { return !q || x.text.toLowerCase().indexOf(q) >= 0; });
      if (q) L.sort(function (a, b) { var A = a.text.trim().toLowerCase(), B = b.text.trim().toLowerCase(); return (B === q) - (A === q) || (B.indexOf(q) === 0) - (A.indexOf(q) === 0); });
      L = L.slice(0, 60);
      var exact = q && all.some(function (x) { return x.text.trim().toLowerCase() === q; });
      if (!list) { list = D.createElement('div'); list.className = 'pk-ls'; D.body.appendChild(list);
        list.addEventListener('mousedown', function (e) { var d = e.target.closest('[data-v]'); if (!d || !cur) return; e.preventDefault(); cur.pick(d.getAttribute('data-v')); }); }
      cur = api;
      var H = [];
      if (!q && eo && cv !== '') H.push('<div class="pk-no" data-v="">' + esc(eo.text.trim() || '없음') + '</div>');
      L.forEach(function (x) { H.push('<div data-v="' + esc(x.value) + '">' + esc(x.text.trim()) + '</div>'); });
      if (q && !exact && o.create) H.push('<div class="pk-nw" data-v="__new">+ 새로 만들기 “' + esc(inp.value.trim()) + '”</div>');
      if (!H.length) { list.style.display = 'none'; return; }
      list.innerHTML = H.join(''); list.style.display = '';
      var first = list.querySelector('[data-v]:not(.pk-no)'); if (q && first) first.classList.add('on');
      var r = inp.getBoundingClientRect(), below = innerHeight - r.bottom;
      list.style.left = r.left + 'px'; list.style.minWidth = r.width + 'px'; list.style.maxWidth = Math.max(r.width, 260) + 'px';
      if (below < 160 && r.top > below) { list.style.top = ''; list.style.bottom = (innerHeight - r.top + 2) + 'px'; }
      else { list.style.bottom = ''; list.style.top = (r.bottom + 2) + 'px'; }
    }
    var busy = false;
    var api = {
      sel: sel, input: inp,
      pick: async function (v) {
        closeList();
        if (v === '__new') {
          var name = inp.value.trim(); if (!name || busy || !o.create) return;
          busy = true;
          try { var id = await o.create(name, sel); if (id == null) { sync(); return; }
            id = String(id);
            if (!Array.prototype.some.call(sel.options, function (x) { return x.value === id; })) sel.add(new Option(name, id));
            set(id);
          } catch (e) { console.error(e); alert('새로 만들지 못했어요: ' + (e && e.message || e)); sync(); }
          finally { busy = false; }
          return;
        }
        set(v);
      }
    };
    inp.addEventListener('focus', function () { inp.select(); show(); });
    inp.addEventListener('input', show);
    inp.addEventListener('keydown', function (e) {
      var it = list && list.style.display !== 'none' ? Array.prototype.slice.call(list.children) : [], k = it.findIndex(function (d) { return d.classList.contains('on'); });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!it.length) { show(); return; }
        var n = it.length, m = k < 0 ? (e.key === 'ArrowDown' ? 0 : n - 1) : (k + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
        it.forEach(function (d, i) { d.classList.toggle('on', i === m); }); it[m].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        var q = inp.value.trim();
        if (!q) { if (eo) api.pick(''); else closeList(); return; }
        if (k >= 0) { api.pick(it[k].getAttribute('data-v')); return; }
        var same = opts(sel).find(function (x) { return x.text.trim().toLowerCase() === q.toLowerCase(); });
        api.pick(same ? same.value : (o.create ? '__new' : (opts(sel).find(function (x) { return x.text.toLowerCase().indexOf(q.toLowerCase()) >= 0; }) || {}).value || PROTO.get.call(sel)));
      } else if (e.key === 'Escape') {
        if (list && list.style.display !== 'none') { e.preventDefault(); e.stopPropagation(); closeList(); sync(); }
      } else if (e.key === 'Tab') { closeList(); }
    });
    inp.addEventListener('blur', function () {
      setTimeout(function () {
        if (busy || D.activeElement === inp) return;
        if (cur === api) closeList();
        if (!inp.value.trim() && eo && PROTO.get.call(sel) !== '') set(''); else sync();
      }, 150);
    });
    sel._pick = api;
    return api;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var autos = [];
  function scan(rootEl) {
    autos.forEach(function (a) {
      var els = (rootEl.matches && rootEl.matches(a.q)) ? [rootEl] : [];
      if (rootEl.querySelectorAll) els = els.concat(Array.prototype.slice.call(rootEl.querySelectorAll(a.q)));
      els.forEach(function (s) { if (s.tagName === 'SELECT') enhance(s, a.o); });
    });
  }
  var mo = null;
  function auto(q, o) {
    autos.push({ q: q, o: o || {} });
    var go = function () { scan(D.body);
      if (!mo) { mo = new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); }); });
        mo.observe(D.body, { childList: true, subtree: true }); } };
    if (D.body) go(); else D.addEventListener('DOMContentLoaded', go);
  }
  root.Pick = { enhance: enhance, auto: auto };
})(window);
