/*!
 * core.v1.js - 모든 앱이 함께 쓰는 공통 동작 (mnmn 저장소)
 *
 *   <script src="https://jjojjolonglong-sudo.github.io/mnmn/core.v1.js" data-app="bkbk"></script>
 *   (config.js 바로 아래, 앱 코드보다 먼저. 이동 메뉴를 빼려면 data-nav="off")
 *
 * 하는 일
 *  1) 로그인 하나로 통일: 모든 앱이 localStorage 'jjojjo_ses' 한 곳에 로그인 정보를 둬요.
 *     예전 앱별 키(bkbk_sb, diti_ses …)에 남아 있던 로그인은 처음 한 번 자동으로 옮겨요.
 *     저장 모양: { access_token, refresh_token, expires_at(밀리초), user:{id,email,…} }
 *  2) 휴대폰 스크롤 끝 바운스·당겨서 새로고침 없애기
 *  3) 날짜 칸 연도 4자리 제한 (새로 생기는 날짜 칸에도 자동)
 *  4) 앱 이동 메뉴(nav.v1.js) 불러오기
 *  5) 새 앱·앞으로 고칠 앱을 위한 로그인/요청 도우미: Core.login, Core.token, Core.rest, Core.logout
 *
 * 한번 올린 v1의 규칙은 바꾸지 않아요. 크게 바꿀 때는 core.v2.js를 새로 만들어요.
 * 이 파일을 못 불러와도 앱은 그대로 동작해요(앱마다 같은 키를 직접 읽고 써요).
 */
(function (root) {
  'use strict';
  if (root.Core) return;
  var KEY = 'jjojjo_ses';
  var CFG = root.APP_CONFIG || {};
  var SB = CFG.SB || 'https://rtvvajhsnwkkrmncyfbs.supabase.co';
  var ANON = CFG.ANON || '';
  var sc = document.currentScript;
  var app = (sc && sc.dataset && sc.dataset.app) || '';
  var navOff = !!(sc && sc.dataset && sc.dataset.nav === 'off');
  var base = sc && sc.src ? sc.src.replace(/[^/]*$/, '') : 'https://jjojjolonglong-sudo.github.io/mnmn/';

  function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function ses() { var s = read(KEY); return s && s.refresh_token ? s : null; }
  function setSes(s) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} }

  /* ---------- 1) 예전 키에 남은 로그인 옮기기 (처음 한 번) ---------- */
  (function migrate() {
    var OLD = ['bkbk_sb', 'mvmv_sb', 'smsm_sb', 'mgwg_ses', 'diti_ses', 'lvlv_ses', 'bdbd_ses', 'mnmn_ses'];
    var SBJS = 'sb-' + SB.replace(/^https?:\/\//, '').split('.')[0] + '-auth-token';   // supabase-js 기본 키(didi·wkwk·cdcd)
    try {
      var cur = ses(), best = null;
      OLD.concat([SBJS]).forEach(function (k) {
        var v = read(k); if (!v) return;
        if (!cur && v.refresh_token && v.user && v.user.id) {
          var exp = +v.expires_at || 0; if (exp && exp < 1e11) exp *= 1000;   // supabase-js는 초 단위
          var n = { access_token: v.access_token || '', refresh_token: v.refresh_token, expires_at: exp, user: { id: v.user.id, email: v.user.email } };
          if (!best || n.expires_at > best.expires_at) best = n;
        }
        try { localStorage.removeItem(k); } catch (e) {}
      });
      if (!cur && best) setSes(best);
    } catch (e) {}
  })();

  /* ---------- supabase-js를 쓰는 앱(didi·wkwk·cdcd)용 저장소 연결 ----------
   *   supabase.createClient(URL, KEY, window.Core ? { auth: Core.sbAuth } : undefined)
   *   supabase-js는 expires_at을 초 단위로 써서, 읽고 쓸 때 밀리초와 서로 바꿔 줘요. */
  var sbStorage = {
    getItem: function (k) {
      if (k !== KEY) { try { return localStorage.getItem(k); } catch (e) { return null; } }
      var s = ses(); if (!s) return null;
      var ms = +s.expires_at || 0, o = {};
      for (var p in s) o[p] = s[p];
      o.expires_at = Math.round(ms / 1000);
      o.expires_in = Math.max(0, Math.round((ms - Date.now()) / 1000));
      o.token_type = o.token_type || 'bearer';
      return JSON.stringify(o);
    },
    setItem: function (k, v) {
      if (k !== KEY) { try { localStorage.setItem(k, v); } catch (e) {} return; }
      try {
        var o = JSON.parse(v); if (!o || !o.refresh_token) return;
        var exp = +o.expires_at || 0; if (exp && exp < 1e11) exp *= 1000;
        if (!exp) exp = Date.now() + (+o.expires_in || 3600) * 1000;
        o.expires_at = exp; setSes(o);
      } catch (e) {}
    },
    removeItem: function (k) { if (k === KEY) setSes(null); else { try { localStorage.removeItem(k); } catch (e) {} } }
  };

  /* ---------- 5) 로그인/요청 도우미 (새 앱·앞으로 고칠 앱용) ---------- */
  async function gotrue(grant, body) {
    var r = await fetch(SB + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error_description || j.msg || j.error || '로그인 실패');
    var s = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user && j.user.id, email: j.user && j.user.email } };
    setSes(s); return s;
  }
  var rf = null;
  async function token() {
    var s = ses(); if (!s) throw new Error('로그인이 필요해요');
    if (s.expires_at - Date.now() < 60000) {
      rf = rf || gotrue('refresh_token', { refresh_token: s.refresh_token }).finally(function () { rf = null; });
      s = await rf;
    }
    return s.access_token;
  }
  function login(email, password) { return gotrue('password', { email: email, password: password }); }
  async function logout() {
    var s = ses(); setSes(null);
    try { if (s) await fetch(SB + '/auth/v1/logout', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + s.access_token } }); } catch (e) {}
  }
  async function rest(path, opts) {
    opts = opts || {};
    var go = async function () {
      var h = { apikey: ANON, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' };
      for (var k in (opts.headers || {})) h[k] = opts.headers[k];
      var o = {}; for (var p in opts) o[p] = opts[p]; o.headers = h;
      return fetch(SB + '/rest/v1/' + path, o);
    };
    var r = await go();
    if (r.status === 401) { var s = ses(); if (s) { await gotrue('refresh_token', { refresh_token: s.refresh_token }); r = await go(); } }
    if (!r.ok) { var m; try { var j = await r.json(); m = j.message || JSON.stringify(j); } catch (e) { m = 'HTTP ' + r.status; } throw new Error(m); }
    return r.status === 204 ? null : r.json().catch(function () { return null; });
  }

  /* ---------- 2) 바운스·당겨서 새로고침 없애기 ---------- */
  try {
    var st = document.createElement('style'); st.id = 'core-v1';
    st.textContent = 'html,body{overscroll-behavior:none}';
    (document.head || document.documentElement).appendChild(st);
  } catch (e) {}

  /* ---------- 3) 날짜 칸 연도 4자리 ---------- */
  function fixDates(n) {
    try {
      var list = n && n.querySelectorAll ? n.querySelectorAll('input[type=date],input[type=datetime-local],input[type=month]') : [];
      for (var i = 0; i < list.length; i++) {
        var el = list[i]; if (el.max) continue;
        el.max = el.type === 'date' ? '9999-12-31' : el.type === 'month' ? '9999-12' : '9999-12-31T23:59';
      }
    } catch (e) {}
  }
  function startDates() {
    fixDates(document);
    try {
      new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
          var n = ms[i].addedNodes[j]; if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('input[type=date],input[type=datetime-local],input[type=month]') && !n.max) fixDates(n.parentNode || document);
          else fixDates(n);
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startDates); else startDates();

  root.Core = { version: 1, KEY: KEY, app: app, base: base, ses: ses, setSes: setSes, sbAuth: { storageKey: KEY, storage: sbStorage }, login: login, logout: logout, token: token, rest: rest };

  /* ---------- 4) 앱 이동 메뉴 (다른 앱 안에 끼워진 화면에서는 안 띄움) ---------- */
  var framed = false; try { framed = root.self !== root.top; } catch (e) { framed = true; }
  if (!navOff && !framed) {
    try {
      var s2 = document.createElement('script'); s2.src = base + 'nav.v1.js'; s2.async = true; s2.dataset.app = app;
      (document.head || document.documentElement).appendChild(s2);
    } catch (e) {}
  }
})(typeof window !== 'undefined' ? window : globalThis);
