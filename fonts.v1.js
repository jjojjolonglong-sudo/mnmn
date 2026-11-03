/*!
 * fonts.v1.js - 공용 글꼴 모듈 (모든 앱이 <head>에서 불러와요)
 *
 *   <script src="https://.../mnmn/fonts.v1.js" data-app="bkbk"></script>
 *
 * mnmn의 '글꼴' 탭에서 정한 값(Supabase mnmn_setting)을 읽어 앱 위에 덮어씁니다.
 * - 마지막으로 읽은 값을 브라우저에 기억해 두었다가 먼저 적용 → 열릴 때 글꼴이 깜빡 바뀌지 않아요.
 * - 값이 없는 영역은 앱 자체의 글꼴을 그대로 써요.
 * - 영문 글꼴 + 한글 글꼴을 따로 정하면 'font-family: 영문, 한글, 기본' 순서로 쌓여요
 *   (영문 글꼴에 없는 글자만 한글 글꼴로 넘어감).
 *
 * 값 형식:  g:<구글폰트 이름>  /  u:<올린 파일명>  /  s:<CSS font-family 그대로>
 * 설정 행:  app='*' role='mode'  → 'unify' 이면 모든 앱·영역을 role='all'(+ 'all.ko') 하나로 통일
 *           app='<앱>' role='<영역>' (+ '<영역>.ko')
 */
(function (root) {
  'use strict';
  const CFG = root.APP_CONFIG || {};
  const SB = CFG.SB || 'https://rtvvajhsnwkkrmncyfbs.supabase.co';
  const ANON = CFG.ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dnZhamhzbndra3JtbmN5ZmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjkwMTEsImV4cCI6MjEwNzA0NTAxMX0.O2aLLeazv_FhUhbVAkp4vz3pw8GPb_683dUu7Et1Cwk';
  const MEDIA = String(CFG.MEDIA || 'https://media.jjojjolonglong.workers.dev').replace(/\/$/, '');

  /* ---------- 글꼴 목록 ---------- */
  // [값, 이름, 구글 굵기(없으면 400만)]
  const GOOGLE = [
    ['Gowun Dodum', '고운돋움', '400'], ['Gowun Batang', '고운바탕', '400;700'],
    ['Noto Sans KR', '노토 산스 KR', '400;500;700'], ['Noto Serif KR', '노토 세리프 KR', '400;700'],
    ['Nanum Gothic', '나눔고딕', '400;700'], ['Nanum Myeongjo', '나눔명조', '400;700'],
    ['IBM Plex Sans KR', 'IBM Plex Sans KR', '400;700'], ['Gaegu', '개구', '400;700'],
    ['Do Hyeon', '도현', '400'], ['Jua', '주아', '400'], ['Black Han Sans', '블랙한산스', '400'],
    ['Nanum Pen Script', '나눔손글씨 펜', '400'], ['Gamja Flower', '감자꽃', '400'], ['Song Myung', '송명', '400'],
    ['Hi Melody', '하이멜로디', '400'], ['Dongle', '동글', '400;700'], ['Sunflower', '해바라기', '300;500;700'],
    ['Poor Story', '푸어스토리', '400'], ['Single Day', '싱글데이', '400'], ['Yeon Sung', '연성', '400'],
    ['Cute Font', '귀여운폰트', '400'], ['East Sea Dokdo', '동해독도', '400'], ['Gugi', '구기', '400'],
    ['Press Start 2P', 'Press Start 2P (픽셀)', '400'], ['VT323', 'VT323 (레트로)', '400'],
    ['Inter', 'Inter', '400;500;600;700'],
  ];
  const SYSTEM = [
    ['system-ui', '시스템 기본'],
    ['"Malgun Gothic","Apple SD Gothic Neo",sans-serif', '맑은 고딕 / 애플 SD 고딕'],
    ['"Batang","AppleMyungjo",serif', '바탕 / 애플명조'],
    ['"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif', 'Pretendard (설치된 경우)'],
    ['"Courier New","D2Coding",monospace', 'Courier New / D2Coding (고정폭)'],
    ['sans-serif', '고딕 (브라우저 기본)'], ['serif', '명조 (브라우저 기본)'], ['monospace', '고정폭 (브라우저 기본)'],
  ];
  const CATALOG = {
    google: GOOGLE.map(([n, l, w]) => ({ v: 'g:' + n, n: l, w })),
    system: SYSTEM.map(([c, l]) => ({ v: 's:' + c, n: l })),
  };

  /* ---------- 앱별 영역 ----------
   * vars: 앱이 쓰는 CSS 변수 덮어쓰기 / all: 앱 전체(예외 except) / sel: 특정 요소만
   * fb: 뒤에 붙는 기본 글꼴 */
  const SANS = '"Malgun Gothic","Apple SD Gothic Neo",sans-serif', SERIF = '"Batang","AppleMyungjo",serif', MONO = '"Courier New","D2Coding",monospace';
  const ONE = { ui: { label: '전체', all: true, fb: SANS } };
  const APPS = {
    bkbk: { label: 'bkbk 독서', roles: { ui: { label: '인터페이스', vars: ['--ui'], fb: SANS }, se: { label: '본문 (제목·인용)', vars: ['--se'], fb: SERIF } } },
    mvmv: { label: 'mvmv 영상', roles: { ui: { label: '인터페이스', vars: ['--ui'], fb: SANS }, se: { label: '제목·인용', vars: ['--se'], fb: SANS }, px: { label: '픽셀 (로고·탭)', vars: ['--px'], fb: MONO } } },
    cdcd: { label: 'cdcd 음악', roles: { ui: { label: '전체 (레트로)', vars: ['--font-retro'], fb: SANS + ',monospace' } } },
    wkwk: { label: 'wkwk 소설', roles: { ui: { label: '본문', all: true, except: ['.num', '.logo', '.cols .n'], fb: SANS }, mono: { label: '로고·숫자 (고정폭)', sel: '.num,.logo,.cols .n', fb: MONO } } },
    diti: { label: 'diti 사전', roles: { ui: { label: '본문', all: true, except: ['.logo'], fb: SANS }, mono: { label: '로고 (고정폭)', sel: '.logo', fb: MONO } } },
    tdtd: { label: 'tdtd 집필', roles: { ui: { label: 'UI (본문 영역 제외)', all: true, except: ['#ed', '#ed *'], fb: 'system-ui,sans-serif' } } },
    didi: { label: 'didi 다이어리', roles: ONE }, mgwg: { label: 'mgwg 디저트', roles: ONE }, lvlv: { label: 'lvlv 덕질노트', roles: ONE },
    smsm: { label: 'smsm 심즈', roles: ONE }, fsfs: { label: 'fsfs 옷갈아입히기', roles: { ui: { label: '전체 (시계 제외)', all: true, except: ['.clk', '.clk *', '.mp', '.mp *'], fb: SANS }, clk: { label: '시계 전광판 숫자', vars: ['--font-clk'], fb: MONO } } }, ogog: { label: 'ogog 뷰어', roles: ONE },
    mnmn: { label: 'mnmn 관리', roles: ONE },
  };

  /* ---------- 값 → CSS ---------- */
  const q = (n) => '"' + String(n).replace(/["\\]/g, '') + '"';
  const upFam = (name) => 'U_' + String(name).replace(/\.\w+$/, '').replace(/[^\w가-힣]/g, '_');
  function fam(v) {
    if (!v) return '';
    const k = v.slice(0, 2), r = v.slice(2);
    return k === 'g:' ? q(r) : k === 'u:' ? q(upFam(r)) : k === 's:' ? r : '';
  }
  function stack(en, ko, fb) {
    const a = [fam(en), fam(ko)].filter(Boolean);
    return a.length ? a.concat(fb ? [fb] : []).join(',') : '';
  }

  const NOFA = ':not([class*="fa-"]):not(.material-icons):not(.material-symbols-outlined)';
  const sel = (list, tail) => list.map((s) => 'html body ' + s + tail).join(',');

  // 설정 행 → 이 앱의 영역별 값 { role: {en, ko} }
  function resolve(app, rows) {
    const get = (a, r) => { const x = rows.find((y) => y.app === a && y.role === r); return x ? x.value : ''; };
    const spec = (APPS[app] || {}).roles || {};
    const out = {};
    const unify = get('*', 'mode') === 'unify' && (get('*', 'all') || get('*', 'all.ko'));
    Object.keys(spec).forEach((r) => {
      const en = unify ? get('*', 'all') : get(app, r), ko = unify ? get('*', 'all.ko') : get(app, r + '.ko');
      if (en || ko) out[r] = { en, ko };
    });
    return out;
  }

  function css(app, vals) {
    const spec = (APPS[app] || {}).roles || {}, parts = [], exceptAll = [];
    Object.keys(spec).forEach((r) => { if (spec[r].sel && vals[r]) exceptAll.push(spec[r].sel); });
    // 앱 전체 → 요소별 → 순서대로 써서 뒤에 있는 규칙이 이기게 함
    Object.keys(spec).forEach((r) => {
      const s = spec[r], v = vals[r];
      if (!v) return;
      const st = stack(v.en, v.ko, s.fb);
      if (!st) return;
      if (s.vars) parts.push(':root{' + s.vars.map((x) => x + ':' + st + ' !important').join(';') + '}');
      else if (s.all) {
        const ex = (s.except || []).map((e) => ':not(' + e + ')').join('');
        parts.push('html body,html body *' + NOFA + ex + '{font-family:' + st + ' !important}');
      } else if (s.sel) parts.push(sel(s.sel.split(','), '') + '{font-family:' + st + ' !important}');
    });
    return parts.join('\n');
  }

  // 값에 쓰인 글꼴 파일/링크 준비
  function assets(vals) {
    const links = new Set(), faces = new Set();
    Object.values(vals).forEach((v) => [v.en, v.ko].forEach((x) => {
      if (!x) return;
      if (x.startsWith('g:')) links.add(x.slice(2));
      else if (x.startsWith('u:')) faces.add(x.slice(2));
    }));
    return { links, faces };
  }
  const gw = (name) => (GOOGLE.find((g) => g[0] === name) || [0, 0, '400'])[2];
  const gUrl = (name) => 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + (gw(name) === '400' ? '' : ':wght@' + gw(name)) + '&display=swap';
  const fontType = (f) => ({ ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' }[f.split('.').pop().toLowerCase()] || 'truetype');
  const faceCss = (f) => '@font-face{font-family:' + q(upFam(f)) + ';src:url("' + MEDIA + '/o/fonts/' + encodeURIComponent(f) + '") format("' + fontType(f) + '");font-display:swap}';

  const loadedLinks = new Set();
  function ensureLink(name) {
    if (loadedLinks.has(name)) return; loadedLinks.add(name);
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = gUrl(name);
    (document.head || document.documentElement).appendChild(l);
  }
  // 값 하나를 미리 불러오기 (미리보기용)
  const extraFaces = new Set(); let extraStyle = null;
  function ensure(v) {
    if (!v) return;
    if (v.startsWith('g:')) ensureLink(v.slice(2));
    else if (v.startsWith('u:') && !extraFaces.has(v)) {
      extraFaces.add(v);
      if (!extraStyle) { extraStyle = document.createElement('style'); extraStyle.id = 'fonts-preview'; (document.head || document.documentElement).appendChild(extraStyle); }
      extraStyle.textContent += faceCss(v.slice(2)) + '\n';
    }
  }

  let styleEl = null;
  function apply(app, rows) {
    const vals = resolve(app, rows), a = assets(vals);
    a.links.forEach(ensureLink);
    const text = [...a.faces].map(faceCss).join('\n') + '\n' + css(app, vals);
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'fonts-ov'; (document.head || document.documentElement).appendChild(styleEl); }
    if (styleEl.textContent !== text) styleEl.textContent = text;
  }

  /* ---------- 설정 읽기 ---------- */
  const KEY = (app) => 'jjojjo_fonts_v1_' + app;
  async function fetchRows(app) {
    const r = await fetch(SB + '/rest/v1/mnmn_setting?select=app,role,value&app=in.(' + encodeURIComponent(app) + ',*)', { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  async function refresh(app) {
    try {
      const rows = await fetchRows(app);
      let old = ''; try { old = localStorage.getItem(KEY(app)) || ''; } catch (e) {}
      const now = JSON.stringify(rows);
      try { localStorage.setItem(KEY(app), now); } catch (e) {}
      if (now !== old) apply(app, rows);
      return rows;
    } catch (e) { return null; }   // 오프라인 등: 기억해 둔 값 그대로
  }

  const Fonts = { CATALOG, APPS, MEDIA, SB, ANON, fam, stack, ensure, apply, refresh, resolve, upFam, faceCss, gUrl };
  root.Fonts = Fonts;

  // 앱에서 불러온 경우에만 자동 실행 (data-app 필요)
  const sc = document.currentScript, app = sc && sc.dataset && sc.dataset.app;
  if (app) {
    Fonts.app = app;
    try { const c = localStorage.getItem(KEY(app)); if (c) apply(app, JSON.parse(c)); } catch (e) {}
    refresh(app);
  }
})(typeof window !== 'undefined' ? window : globalThis);
