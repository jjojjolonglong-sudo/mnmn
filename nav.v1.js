/*!
 * nav.v1.js - 앱 이동 메뉴 (mnmn 저장소). core.v1.js가 자동으로 불러와요.
 *
 * 화면 왼쪽 아래의 작은 네모 버튼(▦)을 누르면 앱 목록이 뜨고, 고르면 그 앱으로 이동해요.
 * 앱 화면·글꼴과 서로 영향을 주지 않게 따로 떨어진 영역(shadow DOM) 안에 그려요.
 * 앱을 추가하려면 아래 APPS에 한 줄 넣으세요. [폴더 이름, 보이는 이름, 아이콘이 있으면 1]
 */
(function (root) {
  'use strict';
  if (root.__navV1) return; root.__navV1 = true;
  var APPS = [
    ['didi', '다이어리', 1], ['bkbk', '독서', 1], ['mvmv', '영상', 1], ['cdcd', '음악', 1],
    ['wkwk', '소설', 1], ['tdtd', '집필', 0], ['diti', '사전', 1], ['mgwg', '디저트', 1],
    ['bdbd', '식단', 1], ['smsm', '심즈', 1], ['lvlv', '덕질', 1], ['fsfs', '레트로', 1],
    ['mnmn', '관리', 0], ['ogog', '뷰어', 0]
  ];
  var sc = document.currentScript;
  var cur = (sc && sc.dataset && sc.dataset.app) || (root.Core && root.Core.app) || '';
  var site = (sc && sc.src ? sc.src : 'https://jjojjolonglong-sudo.github.io/mnmn/nav.v1.js').replace(/[^/]*\/[^/]*$/, '');   // …github.io/

  function build() {
    if (!document.body) return;
    var host = document.createElement('div'); host.id = 'jj-nav';
    host.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;z-index:2147483000';
    var sh = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var tiles = APPS.map(function (a) {
      var on = a[0] === cur ? ' on' : '';
      var ic = a[2] ? '<img src="' + site + a[0] + '/icon-192.png" alt="" loading="lazy">' : '<span class="tx">' + a[0].slice(0, 2) + '</span>';
      return '<a class="t' + on + '" href="' + site + a[0] + '/">' + ic + '<b>' + a[1] + '</b></a>';
    }).join('');
    sh.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Malgun Gothic","Apple SD Gothic Neo",sans-serif}' +
      '.b{position:fixed;left:calc(8px + env(safe-area-inset-left,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));width:28px;height:28px;padding:0;margin:0;border:1px solid #111;background:#fff;color:#111;opacity:.45;cursor:pointer;display:grid;place-items:center;border-radius:0;-webkit-tap-highlight-color:transparent}' +
      '.b:hover,.b.on{opacity:1}' +
      '.b i{display:grid;grid-template-columns:repeat(3,4px);gap:2px}.b i u{width:4px;height:4px;background:#111;display:block}' +
      '.p{position:fixed;left:calc(8px + env(safe-area-inset-left,0px));bottom:calc(42px + env(safe-area-inset-bottom,0px));width:min(264px,calc(100vw - 16px));max-height:calc(100vh - 60px);overflow:auto;background:#fff;border:1px solid #111;padding:8px;display:none;grid-template-columns:repeat(4,1fr);gap:6px 4px;box-shadow:2px 2px 0 rgba(0,0,0,.18)}' +
      '.p.on{display:grid}' +
      '.t{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 0 4px;text-decoration:none;color:#111;border:1px solid transparent}' +
      '.t:hover{border-color:#bbb}.t.on{border-color:#111}' +
      '.t img,.t .tx{width:40px;height:40px;display:block}' +
      '.t .tx{border:1px solid #111;display:grid;place-items:center;font:700 13px/1 ui-monospace,Menlo,Consolas,monospace;text-transform:uppercase;background:#f3f3f0}' +
      '.t b{font-size:11px;line-height:1.2;font-weight:500;white-space:nowrap}' +
      '@media print{.b,.p{display:none!important}}' +
      '</style>' +
      '<div class="p" part="panel">' + tiles + '</div>' +
      '<button class="b" type="button" aria-label="앱 이동" title="앱 이동"><i>' + '<u></u>'.repeat(9) + '</i></button>';
    var b = sh.querySelector('.b'), p = sh.querySelector('.p');
    function set(o) { p.classList.toggle('on', o); b.classList.toggle('on', o); }
    b.addEventListener('click', function (e) { e.stopPropagation(); set(!p.classList.contains('on')); });
    p.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    document.body.appendChild(host);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})(typeof window !== 'undefined' ? window : globalThis);
