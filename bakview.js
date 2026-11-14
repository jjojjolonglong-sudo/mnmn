/*!
 * bakview.js - 백업을 "사람이 보기 좋은" 엑셀 파일로 바꿔 주는 모듈 (mnmn 백업 탭 전용)
 *
 *   BakView.build(T)        T = { 테이블이름: [행…] }  →  [{ file:'bkbk.xlsx', sheets:[{name, cols, rows}] }, …]
 *   BakView.xlsx(sheets)    →  Promise<Uint8Array>  (엑셀 파일 내용. 구글 드라이브에서 열면 구글 시트로 열려요)
 *
 * 규칙(2026-11-14 사용자 결정)
 *  - 앱마다 파일 하나, 안에는 내용별 탭. 대상: bkbk didi mvmv cdcd wkwk bdbd lvlv diti mgwg smsm
 *  - id 대신 이름으로 풀어서 보여 줌(책 id → 책 이름 등). 색상·정렬 번호 같은 화면 꾸밈값은 빼고, 사진은 코드만 넣음.
 *  - 날짜가 있는 탭은 최신이 위. didi 기록에는 독서·영상에서 넘어온 기록도 포함.
 *  - 복구는 이 파일이 아니라 날짜 폴더의 .json으로 해요. 이 파일은 보기 전용이라 매번 새로 만들어 덮어써요.
 * 칸을 바꾸고 싶으면 아래 VIEWS의 해당 앱 부분만 고치면 돼요. 테이블·칸이 없어도 오류 없이 빈 칸으로 나와요.
 */
(function (root) {
  'use strict';

  /* ---------- 작은 도구 ---------- */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function kst(ts, withTime) {            // 시각(UTC) → 한국 날짜 'YYYY-MM-DD' (또는 'YYYY-MM-DD HH:mm')
    if (!ts) return '';
    var d = new Date(new Date(ts).getTime() + 9 * 36e5); if (isNaN(d)) return '';
    var s = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    return withTime ? s + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) : s;
  }
  var by = function (list, key) { var m = new Map(); (list || []).forEach(function (r) { m.set(r[key || 'id'], r); }); return m; };
  var group = function (list, key) { var m = new Map(); (list || []).forEach(function (r) { var k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };
  var num = function (v) { return v === null || v === undefined || v === '' || isNaN(+v) ? '' : +v; };
  var pct = function (v) { return v === null || v === undefined || v === '' ? '' : Math.round(+v * 1000) / 10; };
  var yes = function (v) { return v ? '○' : ''; };
  var desc = function (k) { return function (a, b) { return a[k] < b[k] ? 1 : a[k] > b[k] ? -1 : 0; }; };   // 최신이 위(빈 값은 아래)
  var asc = function (k) { return function (a, b) { return String(a[k] || '').localeCompare(String(b[k] || ''), 'ko'); }; };
  var hms = function (s) { if (s === null || s === undefined || s === '') return ''; s = +s; return Math.floor(s / 3600) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(Math.floor(s % 60)); };
  /* 탭 만들기: cols = [[제목, 값을 꺼내는 함수, 너비(글자 수, 생략 가능), 'n'이면 숫자]], list = 행 목록 */
  function tab(name, cols, list) {
    return {
      name: name,
      cols: cols.map(function (c) { return { h: c[0], w: c[2] || 12, n: c[3] === 'n' }; }),
      rows: (list || []).map(function (r) { return cols.map(function (c) { var v; try { v = c[1](r); } catch (e) { v = ''; } return v === null || v === undefined ? '' : v; }); })
    };
  }

  /* ---------- 앱별 보기 ---------- */
  var VIEWS = {
    bkbk: function (T) {
      var ser = by(T.bkbk_series), tag = by(T.bkbk_tags), books = by(T.bkbk_books), words = by(T.diti_words);
      var title = function (b) { if (!b) return ''; var s = ser.get(b.series); return (s ? s.name : '') + (b.label ? ' [' + b.label + ']' : ''); };
      var tname = function (id) { var t = tag.get(id); return t ? t.name : ''; };
      var tnames = function (ids) { return (ids || []).map(tname).filter(Boolean).join(', '); };
      var bt = function (id) { return title(books.get(id)); };
      var last = new Map(); (T.bkbk_logs || []).forEach(function (l) { if (!last.has(l.book) || last.get(l.book) < l.date) last.set(l.book, l.date); });
      var KIND = { author: '작가', genre: '장르', platform: '플랫폼', theme: '주제' };
      var used = new Map(); (T.bkbk_books || []).forEach(function (b) { [b.author, b.platform].concat(b.genre || []).forEach(function (i) { if (i) used.set(i, (used.get(i) || 0) + 1); }); });
      (T.bkbk_texts || []).forEach(function (t) { (t.tags || []).forEach(function (i) { used.set(i, (used.get(i) || 0) + 1); }); });
      return [
        tab('책', [['책', title, 34], ['권', function (b) { return num(b.volume); }, 5, 'n'], ['작가', function (b) { return tname(b.author); }, 18], ['장르', function (b) { return tnames(b.genre); }, 18],
          ['플랫폼', function (b) { return tname(b.platform); }, 10], ['쪽수', function (b) { return num(b.page); }, 7, 'n'], ['글자수', function (b) { return num(b.charcount); }, 7, 'n'],
          ['별점', function (b) { return num(b.star); }, 5, 'n'], ['한줄평', function (b) { return b.comment; }, 60], ['마지막 읽은 날', function (b) { return last.get(b.id); }, 12], ['표지 코드', function (b) { return b.cover; }, 18]],
          (T.bkbk_books || []).slice().sort(function (a, b) { return title(a).localeCompare(title(b), 'ko') || (a.volume || 0) - (b.volume || 0); })),
        tab('독서 기록', [['날짜', function (l) { return l.date; }, 11], ['책', function (l) { return bt(l.book); }, 34], ['챕터', function (l) { return l.chapter; }, 20],
          ['시작 쪽', function (l) { return num(l.onpage); }, 7, 'n'], ['끝 쪽', function (l) { return num(l.offpage); }, 7, 'n'], ['시작 %', function (l) { return pct(l.onpct); }, 7, 'n'], ['끝 %', function (l) { return pct(l.offpct); }, 7, 'n']],
          (T.bkbk_logs || []).slice().sort(desc('date'))),
        tab('밑줄', [['날짜', function (t) { return t.date; }, 11], ['책', function (t) { return bt(t.book); }, 30], ['챕터', function (t) { return t.chapter; }, 16], ['쪽', function (t) { return num(t.page); }, 6, 'n'],
          ['%', function (t) { return pct(t.pct); }, 6, 'n'], ['문장', function (t) { return t.text; }, 80], ['내 생각', function (t) { return t.notion; }, 50], ['태그', function (t) { return tnames(t.tags); }, 16]],
          (T.bkbk_texts || []).slice().sort(desc('date'))),
        tab('단어', [['날짜', function (u) { return u.date; }, 11], ['단어', function (u) { var w = words.get(u.word_id); return w ? w.word : ''; }, 14], ['뜻', function (u) { var w = words.get(u.word_id); return w ? w.meaning : ''; }, 50],
          ['책', function (u) { return bt(u.book); }, 30], ['챕터', function (u) { return u.chapter; }, 16], ['쪽', function (u) { return num(u.page); }, 6, 'n'], ['용례', function (u) { return u.example; }, 60]],
          (T.bkbk_word_use || []).slice().sort(desc('date'))),
        tab('작가·장르·태그', [['종류', function (t) { return KIND[t.type] || t.type; }, 9], ['이름', function (t) { return t.name; }, 30], ['쓰인 횟수', function (t) { return used.get(t.id) || 0; }, 9, 'n']],
          (T.bkbk_tags || []).slice().sort(function (a, b) { return String(a.type).localeCompare(String(b.type)) || String(a.name).localeCompare(String(b.name), 'ko'); }))
      ];
    },

    didi: function (T) {
      var cat = by(T.didi_category), idx = by(T.didi_index);
      var cn = function (id) { var c = cat.get(id); return c ? c.name : ''; }, inn = function (id) { var i = idx.get(id); return i ? i.name : ''; };
      var live = (T.didi_log || []).filter(function (l) { return !l.discarded_at; });
      var src = function (l) { var m = l.meta || {}; return m.bkbk_book ? '독서' : m.mvmv_movie ? '영상' : ''; };
      var dayOf = function (l) { return kst(l.done_at) || l.log_date || kst(l.created_at); };
      var done = live.filter(function (l) { return l.is_checked; }).map(function (l) { return Object.assign({ _d: dayOf(l) }, l); }).sort(desc('_d'));
      var todo = live.filter(function (l) { return !l.is_checked; }).map(function (l) { return Object.assign({ _d: kst(l.created_at) }, l); }).sort(desc('_d'));
      var WD = '일월화수목금토';
      var recur = function (r) { if (!r) return ''; if (r.t === 'd') return '매일'; if (r.t === 'w') return '매주 ' + (r.d || []).map(function (x) { return WD[x] || x; }).join('·'); if (r.t === 'm') return '매월 ' + r.d + '일'; if (r.t === 'n') return r.n + '일마다'; return JSON.stringify(r); };
      var perIdx = group(live, 'index_id'), perCat = group(live, 'category_id'), idxPerCat = group(T.didi_index, 'category_id');
      var cols = [['분류', function (l) { return cn(l.category_id); }, 10], ['인덱스', function (l) { return inn(l.index_id); }, 20], ['내용', function (l) { return l.text; }, 44], ['메모', function (l) { return (l.meta || {}).memo; }, 50], ['출처', src, 6], ['사진 코드', function (l) { return l.image_url; }, 18]];
      return [
        tab('기록', [['날짜', function (l) { return l._d; }, 11]].concat(cols).concat([['기록한 날짜', function (l) { return l.log_date; }, 11]]), done),
        tab('할 일', [['만든 날', function (l) { return l._d; }, 11], ['예정일', function (l) { return l.log_date; }, 11]].concat(cols), todo),
        tab('인덱스', [['분류', function (i) { return cn(i.category_id); }, 10], ['이름', function (i) { return i.name; }, 26], ['이모지', function (i) { return i.emoji; }, 6], ['반복', function (i) { return recur(i.recur); }, 14],
          ['시작', function (i) { return i.started_on; }, 11], ['끝', function (i) { return i.finished_on; }, 11], ['기록 수', function (i) { return (perIdx.get(i.id) || []).length; }, 7, 'n'], ['사진 코드', function (i) { return i.image_url; }, 18]],
          (T.didi_index || []).slice().sort(function (a, b) { return cn(a.category_id).localeCompare(cn(b.category_id), 'ko') || (a.sort_order || 0) - (b.sort_order || 0); })),
        tab('분류', [['이름', function (c) { return c.name; }, 14], ['인덱스 수', function (c) { return (idxPerCat.get(c.id) || []).length; }, 9, 'n'], ['기록 수', function (c) { return (perCat.get(c.id) || []).length; }, 9, 'n']],
          (T.didi_category || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })),
        tab('휴지통', [['버린 날', function (l) { return kst(l.discarded_at); }, 11]].concat(cols), (T.didi_log || []).filter(function (l) { return l.discarded_at; }).sort(desc('discarded_at')))
      ];
    },

    mvmv: function (T) {
      var mv = by(T.mvmv_movie), pp = by(T.mvmv_people), ep = by(T.mvmv_episode);
      var mn = function (id) { var m = mv.get(id); return m ? m.name : ''; }, pn = function (id) { var p = pp.get(id); return p ? p.name : ''; };
      var mins = function (s) { return s === null || s === undefined || s === '' ? '' : Math.round(+s / 60); };
      return [
        tab('작품', [['본 날', function (m) { return m.date; }, 11], ['이름', function (m) { return m.name; }, 30], ['종류', function (m) { return m.sort; }, 8], ['장르', function (m) { return m.genre; }, 16], ['개봉일', function (m) { return m.release; }, 11],
          ['러닝타임(분)', function (m) { return mins(m.runtime); }, 10, 'n'], ['플랫폼', function (m) { return m.platform; }, 9], ['별점', function (m) { return num(m.star); }, 5, 'n'], ['리뷰', function (m) { return m.review; }, 70], ['포스터 코드', function (m) { return m.poster; }, 18]],
          (T.mvmv_movie || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || String(a.name).localeCompare(String(b.name), 'ko'); })),
        tab('회차', [['본 날', function (e) { return e.watched; }, 11], ['작품', function (e) { return mn(e.movie); }, 30], ['회', function (e) { return num(e.episode); }, 5, 'n'], ['러닝타임(분)', function (e) { return mins(e.runtime); }, 10, 'n'], ['리뷰', function (e) { return e.review; }, 70]],
          (T.mvmv_episode || []).slice().sort(desc('watched'))),
        tab('인물', [['작품', function (r) { return mn(r.movie); }, 30], ['구분', function (r) { return r.sort; }, 7], ['이름', function (r) { return pn(r.people); }, 18], ['배역', function (r) { return r.role; }, 18],
          ['국적', function (r) { return (pp.get(r.people) || {}).nation; }, 8], ['출생', function (r) { return (pp.get(r.people) || {}).birth; }, 11], ['사망', function (r) { return (pp.get(r.people) || {}).death; }, 11], ['메모', function (r) { return (pp.get(r.people) || {}).memo; }, 30], ['사진 코드', function (r) { return r.thumb; }, 18]],
          (T.mvmv_movie_people || []).slice().sort(function (a, b) { return mn(a.movie).localeCompare(mn(b.movie), 'ko') || String(a.sort).localeCompare(String(b.sort), 'ko'); })),
        tab('장면', [['작품', function (s) { return mn(s.movie); }, 30], ['회', function (s) { var e = ep.get(s.episode); return e ? num(e.episode) : ''; }, 5, 'n'], ['시간', function (s) { return hms(s.timectup); }, 9], ['배우', function (s) { return (s.actor || []).map(pn).filter(Boolean).join(', '); }, 20],
          ['대사', function (s) { return s.line; }, 50], ['메모', function (s) { return s.memo; }, 40], ['사진 코드', function (s) { return s.image; }, 18], ['원본 파일', function (s) { return s.local; }, 40]],
          (T.mvmv_scene || []).slice().sort(function (a, b) { return mn(a.movie).localeCompare(mn(b.movie), 'ko') || (a.timectup || 0) - (b.timectup || 0); }))
      ];
    },

    cdcd: function (T) {
      var ar = by(T.cdcd_artist), al = by(T.cdcd_album), mu = by(T.cdcd_music), pl = by(T.cdcd_playlist);
      var an = function (id) { var a = ar.get(id); return a ? a.name : ''; }, aln = function (id) { var a = al.get(id); return a ? a.name : ''; };
      var muByAl = group(T.cdcd_music, 'album_id'), muByAr = group(T.cdcd_music, 'artist_id'), alByAr = group(T.cdcd_album, 'artist_id');
      return [
        tab('곡', [['곡', function (m) { return m.name; }, 30], ['아티스트', function (m) { return an(m.artist_id); }, 20], ['앨범', function (m) { return aln(m.album_id); }, 26], ['유튜브', function (m) { return m.youtube_url; }, 46], ['가사', function (m) { return m.lyric; }, 50]],
          (T.cdcd_music || []).slice().sort(function (a, b) { return an(a.artist_id).localeCompare(an(b.artist_id), 'ko') || String(a.name).localeCompare(String(b.name), 'ko'); })),
        tab('앨범', [['앨범', function (a) { return a.name; }, 28], ['아티스트', function (a) { return an(a.artist_id); }, 20], ['발매일', function (a) { return a.release_date; }, 11], ['곡 수', function (a) { return (muByAl.get(a.id) || []).length; }, 6, 'n'], ['표지 코드', function (a) { return a.cover; }, 18]],
          (T.cdcd_album || []).slice().sort(function (a, b) { return an(a.artist_id).localeCompare(an(b.artist_id), 'ko') || String(a.name).localeCompare(String(b.name), 'ko'); })),
        tab('아티스트', [['이름', function (a) { return a.name; }, 22], ['솔로', function (a) { return a.is_solo === null || a.is_solo === undefined ? '' : a.is_solo ? '솔로' : '그룹'; }, 6], ['멤버', function (a) { return a.member; }, 30],
          ['앨범 수', function (a) { return (alByAr.get(a.id) || []).length; }, 7, 'n'], ['곡 수', function (a) { return (muByAr.get(a.id) || []).length; }, 6, 'n']], (T.cdcd_artist || []).slice().sort(asc('name'))),
        tab('플레이리스트', [['플레이리스트', function (t) { var p = pl.get(t.playlist_id); return p ? p.name : ''; }, 28], ['순서', function (t) { return num(t.track_order); }, 5, 'n'], ['곡', function (t) { var m = mu.get(t.music_id); return m ? m.name : ''; }, 30],
          ['아티스트', function (t) { var m = mu.get(t.music_id); return m ? an(m.artist_id) : ''; }, 20]],
          (T.cdcd_playlist_track || []).slice().sort(function (a, b) { return (a.playlist_id - b.playlist_id) || (a.track_order - b.track_order); }))
      ];
    },

    wkwk: function (T) {
      var wk = by(T.wkwk_work), wn = function (id) { var w = wk.get(id); return w ? w.name : ''; };
      return [
        tab('작품', [['이름', function (w) { return w.name; }, 28], ['필명', function (w) { return w.penname; }, 12], ['분량', function (w) { return num(w.vol); }, 7, 'n'], ['가격', function (w) { return num(w.price); }, 8, 'n'], ['로그라인', function (w) { return w.logline; }, 60], ['표지 코드', function (w) { return w.cover; }, 18]],
          (T.wkwk_work || []).slice().sort(asc('name'))),
        tab('일정', [['시작', function (e) { return e.start_date; }, 11], ['끝', function (e) { return e.end_date; }, 11], ['작품', function (e) { return wn(e.work_id); }, 28], ['종류', function (e) { return e.type; }, 8]], (T.wkwk_event || []).slice().sort(desc('start_date'))),
        tab('정산', [['기간', function (i) { return String(i.span || '').slice(0, 7); }, 9], ['작품', function (i) { return wn(i.work_id); }, 28], ['판매', function (i) { return num(i.sell); }, 7, 'n'], ['수익', function (i) { return num(i.income); }, 10, 'n'], ['별', function (i) { return num(i.star); }, 7, 'n']],
          (T.wkwk_income || []).slice().sort(function (a, b) { return (b.span || '').localeCompare(a.span || '') || wn(a.work_id).localeCompare(wn(b.work_id), 'ko'); })),
        tab('원고', [['날짜', function (c) { return c.date; }, 11], ['작품', function (c) { return wn(c.work_id); }, 28], ['파일', function (c) { return c.copy; }, 40], ['마지막 수정', function (c) { return kst(c.modified_at, true); }, 17]], (T.wkwk_copy || []).slice().sort(desc('date')))
      ];
    },

    bdbd: function (T) {
      var kv = new Map(); (T.bdbd_kv || []).forEach(function (r) { kv.set(r.key, r.value); });
      var MEAL = ['아침', '점심', '저녁'], meals = [], moves = [], days = [];
      Array.from(kv.keys()).filter(function (k) { return k.slice(0, 2) === 'd:'; }).sort().reverse().forEach(function (k) {
        var d = k.slice(2), v = kv.get(k) || {}, m = v.m || [], x = v.x || [], s = { d: d, k: 0, c: 0, p: 0, f: 0, x: 0, n: m.length };
        m.slice().sort(function (a, b) { return (a.meal || 0) - (b.meal || 0); }).forEach(function (e) { meals.push(Object.assign({ d: d }, e)); ['k', 'c', 'p', 'f'].forEach(function (q) { s[q] += +e[q] || 0; }); });
        x.forEach(function (e) { moves.push(Object.assign({ d: d }, e)); s.x += +e.k || 0; });
        days.push(s);
      });
      var r1 = function (v) { return Math.round(v * 10) / 10; };
      var pf = kv.get('pf') || {}, info = [['키(cm)', pf.h], ['성별', pf.sex], ['생일', pf.birth], ['활동 계수', pf.act]];
      (pf.goals || []).forEach(function (g, i) { info.push(['목표 ' + (i + 1), (g.start || '') + ' ~ ' + (g.end || '') + ' : ' + (g.w === undefined ? '' : g.w) + 'kg → ' + (g.tw === undefined ? '' : g.tw) + 'kg']); });
      var food = [['이름', function (f) { return f.n; }, 28], ['기준량(g)', function (f) { return num(f.g); }, 9, 'n'], ['열량', function (f) { return num(f.k); }, 7, 'n'], ['탄수화물', function (f) { return num(f.c); }, 8, 'n'], ['단백질', function (f) { return num(f.p); }, 7, 'n'], ['지방', function (f) { return num(f.f); }, 6, 'n'], ['분류', function (f) { return f.cat; }, 24]];
      return [
        tab('식단', [['날짜', function (e) { return e.d; }, 11], ['끼니', function (e) { return MEAL[e.meal] || ''; }, 6], ['음식', function (e) { return e.n; }, 28], ['양', function (e) { return e.amt; }, 8], ['무게(g)', function (e) { return num(e.g); }, 8, 'n'], ['열량', function (e) { return num(e.k); }, 7, 'n'],
          ['탄수화물', function (e) { return num(e.c); }, 8, 'n'], ['단백질', function (e) { return num(e.p); }, 7, 'n'], ['지방', function (e) { return num(e.f); }, 6, 'n'], ['당', function (e) { return num(e.su); }, 6, 'n'], ['나트륨', function (e) { return num(e.na); }, 7, 'n'], ['분류', function (e) { return e.cat; }, 24]], meals),
        tab('하루 합계', [['날짜', function (s) { return s.d; }, 11], ['음식 수', function (s) { return s.n; }, 7, 'n'], ['열량', function (s) { return r1(s.k); }, 8, 'n'], ['탄수화물', function (s) { return r1(s.c); }, 8, 'n'], ['단백질', function (s) { return r1(s.p); }, 7, 'n'], ['지방', function (s) { return r1(s.f); }, 6, 'n'], ['운동 소모', function (s) { return r1(s.x); }, 9, 'n']], days),
        tab('운동', [['날짜', function (e) { return e.d; }, 11], ['운동', function (e) { return e.n; }, 24], ['시간(분)', function (e) { return num(e.min); }, 8, 'n'], ['소모 열량', function (e) { return num(e.k); }, 9, 'n']], moves),
        tab('체성분', [['날짜', function (b) { return b.d; }, 11], ['체중(kg)', function (b) { return num(b.w); }, 9, 'n'], ['체지방률(%)', function (b) { return num(b.f); }, 11, 'n'], ['골격근량(%)', function (b) { return num(b.m); }, 11, 'n']], (kv.get('bd') || []).slice().sort(desc('d'))),
        tab('내 정보', [['항목', function (r) { return r[0]; }, 12], ['값', function (r) { return r[1]; }, 44]], info),
        tab('내 음식', food, kv.get('cf') || [])
      ];
    },

    lvlv: function (T) {
      var ch = by(T.lvlv_char), kw = by(T.lvlv_keyword), img = by(T.lvlv_image);
      var kinds = (T.lvlv_kind || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }), kname = new Map(kinds.map(function (k) { return [k.code, k.name]; }));
      var kwOf = group(T.lvlv_char_keyword, 'char_id'), chOf = group(T.lvlv_char_keyword, 'keyword_id'), imgOf = group(T.lvlv_image, 'char_id');
      var cn = function (id) { var c = ch.get(id); return c ? c.name : ''; };
      var words = function (c, code) { return (kwOf.get(c.id) || []).map(function (l) { return kw.get(l.keyword_id); }).filter(function (k) { return k && k.kind === code; }).map(function (k) { return k.name; }).sort(function (a, b) { return a.localeCompare(b, 'ko'); }).join(', '); };
      var SEX = { f: '여', m: '남' };
      var cols = [['이름', function (c) { return c.name; }, 14], ['풀네임', function (c) { return c.full_name; }, 20], ['출처', function (c) { return c.origin; }, 16], ['성별', function (c) { return SEX[c.sex] || c.sex; }, 5], ['프로필', function (c) { return c.profile; }, 44], ['어록', function (c) { return c.quote; }, 60]]
        .concat(kinds.map(function (k) { return [k.name, function (c) { return words(c, k.code); }, 24]; }))
        .concat([['사진 수', function (c) { return (imgOf.get(c.id) || []).length; }, 7, 'n'], ['대표 사진 코드', function (c) { var i = img.get(c.cover_id); return i ? i.image : ''; }, 18]]);
      return [
        tab('인물', cols, (T.lvlv_char || []).slice().sort(asc('name'))),
        tab('키워드', [['분류', function (k) { return kname.get(k.kind) || k.kind; }, 12], ['키워드', function (k) { return k.name; }, 18], ['인물 수', function (k) { return (chOf.get(k.id) || []).length; }, 7, 'n'],
          ['인물', function (k) { return (chOf.get(k.id) || []).map(function (l) { return cn(l.char_id); }).filter(Boolean).sort(function (a, b) { return a.localeCompare(b, 'ko'); }).join(', '); }, 60]],
          (T.lvlv_keyword || []).slice().sort(function (a, b) { return String(kname.get(a.kind) || a.kind).localeCompare(String(kname.get(b.kind) || b.kind), 'ko') || String(a.name).localeCompare(String(b.name), 'ko'); })),
        tab('글감', [['인물', function (t) { return cn(t.char_id); }, 14], ['내용', function (t) { return t.body; }, 90], ['출처', function (t) { return t.source; }, 24]],
          (T.lvlv_text || []).slice().sort(function (a, b) { return cn(a.char_id).localeCompare(cn(b.char_id), 'ko') || (a.sort_order || 0) - (b.sort_order || 0); })),
        tab('사진', [['인물', function (i) { return cn(i.char_id); }, 14], ['사진 코드', function (i) { return i.image; }, 18], ['설명', function (i) { return i.caption; }, 40]],
          (T.lvlv_image || []).slice().sort(function (a, b) { return cn(a.char_id).localeCompare(cn(b.char_id), 'ko') || (a.sort_order || 0) - (b.sort_order || 0); }))
      ];
    },

    diti: function (T) {
      var words = by(T.diti_words), ser = by(T.bkbk_series), books = by(T.bkbk_books), useOf = group(T.bkbk_word_use, 'word_id');
      var bt = function (id) { var b = books.get(id); if (!b) return ''; var s = ser.get(b.series); return (s ? s.name : '') + (b.label ? ' [' + b.label + ']' : ''); };
      return [
        tab('단어장', [['단어', function (w) { return w.word; }, 16], ['뜻', function (w) { return w.meaning; }, 80], ['태그', function (w) { return (w.tags || []).join(', '); }, 16], ['용례 수', function (w) { return (useOf.get(w.id) || []).length; }, 7, 'n'], ['담은 날', function (w) { return kst(w.created_at); }, 11]],
          (T.diti_words || []).slice().sort(asc('word'))),
        tab('용례', [['날짜', function (u) { return u.date; }, 11], ['단어', function (u) { var w = words.get(u.word_id); return w ? w.word : ''; }, 16], ['책', function (u) { return bt(u.book); }, 30], ['챕터', function (u) { return u.chapter; }, 16], ['쪽', function (u) { return num(u.page); }, 6, 'n'], ['용례', function (u) { return u.example; }, 70]],
          (T.bkbk_word_use || []).slice().sort(desc('date')))
      ];
    },

    mgwg: function (T) {
      var st = by(T.mgwg_store), so = by(T.mgwg_sort), sortOf = group(T.mgwg_item_sort, 'item_id'), itemOf = group(T.mgwg_item_sort, 'sort_id'), byStore = group(T.mgwg_item, 'store_id');
      var sn = function (id) { var s = st.get(id); return s ? s.name : ''; };
      var sum = function (l) { return (l || []).reduce(function (a, i) { return a + (+i.price || 0); }, 0); };
      return [
        tab('기록', [['날짜', function (i) { return i.date; }, 11], ['이름', function (i) { return i.name; }, 28], ['가게', function (i) { return sn(i.store_id); }, 20],
          ['분류', function (i) { return (sortOf.get(i.id) || []).map(function (l) { var s = so.get(l.sort_id); return s ? s.name : ''; }).filter(Boolean).join(', '); }, 22],
          ['주문', function (i) { return i.order_type; }, 7], ['가격', function (i) { return num(i.price); }, 8, 'n'], ['한줄평', function (i) { return i.comment; }, 60], ['사진 코드', function (i) { return i.photo; }, 18]], (T.mgwg_item || []).slice().sort(desc('date'))),
        tab('가게', [['이름', function (s) { return s.name; }, 22], ['주소', function (s) { return s.address; }, 44], ['기록 수', function (s) { return (byStore.get(s.id) || []).length; }, 7, 'n'], ['쓴 금액', function (s) { return sum(byStore.get(s.id)); }, 9, 'n'], ['사진 코드', function (s) { return s.photo; }, 18]],
          (T.mgwg_store || []).slice().sort(asc('name'))),
        tab('분류', [['이름', function (s) { return s.name; }, 22], ['기록 수', function (s) { return (itemOf.get(s.id) || []).length; }, 7, 'n'], ['사진 코드', function (s) { return s.photo; }, 18]], (T.mgwg_sort || []).slice().sort(asc('name')))
      ];
    },

    smsm: function (T) {
      var sim = by(T.smsm_sim), play = by(T.smsm_play), life = by(T.smsm_lifetime, 'play');
      var nm = function (id) { var s = sim.get(id); return s ? (s.family_name || '') + (s.first_name || '') : ''; };
      var pl = function (id) { var p = play.get(id); return p ? (p.type || '') + (p.start_date ? ' (' + p.start_date + ')' : '') : ''; };
      var SO = { lover: '애인', bestie: '단짝', friend: '친구', old_friend: '지인', ex: '전애인', enemy: '적대' };
      var L = function (k) { return function (p) { var l = life.get(p.id); return l ? num(l[k]) : ''; }; };
      return [
        tab('심', [['이름', function (s) { return nm(s.id); }, 14], ['성별', function (s) { return s.sex; }, 8], ['아버지', function (s) { return nm(s.father); }, 14], ['어머니', function (s) { return nm(s.mother); }, 14], ['배우자', function (s) { return nm(s.partner); }, 14],
          ['태어난 날(게임 일)', function (s) { return num(s.birth_day); }, 14, 'n'], ['플레이', function (s) { return pl(s.play); }, 22]], (T.smsm_sim || []).slice().sort(function (a, b) { return nm(a.id).localeCompare(nm(b.id), 'ko'); })),
        tab('관계', [['심 1', function (r) { return nm(r.sim1); }, 14], ['심 2', function (r) { return nm(r.sim2); }, 14], ['혈연(촌)', function (r) { return num(r.blood); }, 8, 'n'], ['관계', function (r) { return r.social ? (SO[r.social] || r.social) : (r.friendly === false ? '적대' : '우호'); }, 8],
          ['결혼', function (r) { return yes(r.marry); }, 5], ['메모', function (r) { return r.comment; }, 40]], T.smsm_relation || []),
        tab('플레이', [['종류', function (p) { return p.type; }, 8], ['목표', function (p) { return p.goal; }, 40], ['시작', function (p) { return p.start_date; }, 11], ['끝', function (p) { return p.end_date; }, 11],
          ['아기', L('baby'), 6, 'n'], ['영아', L('infant'), 6, 'n'], ['유아', L('toddler'), 6, 'n'], ['어린이', L('child'), 7, 'n'], ['청소년', L('teen'), 7, 'n'], ['청년', L('young_adult'), 6, 'n'], ['성인', L('adult'), 6, 'n'], ['노인', L('elder'), 6, 'n'], ['유령', L('ghost'), 6, 'n']],
          (T.smsm_play || []).slice().sort(desc('start_date'))),
        tab('프로필', [['심', function (p) { return nm(p.sim); }, 14], ['종류', function (p) { return p.type; }, 10], ['단계', function (p) { return p.stage; }, 10], ['사진 코드', function (p) { return p.profile; }, 18]], T.smsm_profile || []),
        tab('앨범', [['찍은 날', function (a) { return kst(a.created_at); }, 11], ['심', function (a) { return (a.sims || []).map(nm).filter(Boolean).join(', '); }, 30], ['사진 코드', function (a) { return a.photo; }, 18], ['플레이', function (a) { return pl(a.play); }, 22]],
          (T.smsm_album || []).slice().sort(desc('created_at')))
      ];
    }
  };
  var ORDER = ['bkbk', 'didi', 'mvmv', 'cdcd', 'wkwk', 'bdbd', 'lvlv', 'diti', 'mgwg', 'smsm'];

  function build(T) {
    T = T || {};
    return ORDER.map(function (app) {
      try { return { file: app + '.xlsx', sheets: VIEWS[app](T) }; }
      catch (e) { return { file: app + '.xlsx', error: String(e && e.message || e), sheets: [tab('오류', [['내용', function (r) { return r; }, 80]], ['이 앱의 보기용 표를 만들다가 문제가 생겼어요: ' + (e && e.message || e)])] }; }
    });
  }

  /* ---------- 엑셀(.xlsx) 파일 쓰기: 라이브러리 없이 필요한 만큼만 ---------- */
  var enc = new TextEncoder();
  function esc(s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(sh) {
    var n = sh.cols.length, out = [];
    out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
    out.push('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>');
    out.push('<cols>' + sh.cols.map(function (c, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + Math.min(90, Math.max(5, c.w)) + '" customWidth="1"/>'; }).join('') + '</cols><sheetData>');
    out.push('<row r="1">' + sh.cols.map(function (c, i) { return '<c r="' + colName(i) + '1" t="inlineStr" s="1"><is><t>' + esc(c.h) + '</t></is></c>'; }).join('') + '</row>');
    sh.rows.forEach(function (row, ri) {
      var r = ri + 2, cells = '';
      for (var i = 0; i < n; i++) {
        var v = row[i]; if (v === '' || v === null || v === undefined) continue;
        if (sh.cols[i].n && typeof v === 'number' && isFinite(v)) cells += '<c r="' + colName(i) + r + '" s="2"><v>' + v + '</v></c>';
        else { var t = esc(String(v).slice(0, 32000)); cells += '<c r="' + colName(i) + r + '" t="inlineStr" s="' + (sh.cols[i].w >= 40 ? 3 : 2) + '"><is><t xml:space="preserve">' + t + '</t></is></c>'; }
      }
      out.push('<row r="' + r + '">' + cells + '</row>');
    });
    out.push('</sheetData>');
    if (n) out.push('<autoFilter ref="A1:' + colName(n - 1) + Math.max(1, sh.rows.length + 1) + '"/>');
    out.push('</worksheet>');
    return out.join('');
  }
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  async function deflate(u) {
    if (typeof CompressionStream !== 'function') return null;
    try { var s = new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); } catch (e) { return null; }
  }
  async function zip(files) {            // files = [[이름, 글]]
    var parts = [], central = [], off = 0;
    for (var i = 0; i < files.length; i++) {
      var name = enc.encode(files[i][0]), raw = enc.encode(files[i][1]), crc = crc32(raw), z = await deflate(raw), data = z && z.length < raw.length ? z : raw, method = data === raw ? 0 : 8;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, method, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, raw.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, method, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, raw.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    var csize = central.reduce(function (a, p) { return a + p.length; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    var all = parts.concat(central, [new Uint8Array(e.buffer)]), total = all.reduce(function (a, p) { return a + p.length; }, 0), out = new Uint8Array(total), p = 0;
    all.forEach(function (x) { out.set(x, p); p += x.length; });
    return out;
  }
  function xlsx(sheets) {
    var seen = {}, names = sheets.map(function (s, i) { var n = String(s.name || '시트' + (i + 1)).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31); while (seen[n]) n = n.slice(0, 28) + ' ' + (i + 1); seen[n] = 1; return n; });
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', NS = 'http://schemas.openxmlformats.org/', files = [];
    files.push(['[Content_Types].xml', X + '<Types xmlns="' + NS + 'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>']);
    files.push(['_rels/.rels', X + '<Relationships xmlns="' + NS + 'package/2006/relationships"><Relationship Id="rId1" Type="' + NS + 'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
    files.push(['xl/workbook.xml', X + '<workbook xmlns="' + NS + 'spreadsheetml/2006/main" xmlns:r="' + NS + 'officeDocument/2006/relationships"><sheets>' +
      names.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>']);
    files.push(['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="' + NS + 'package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + NS + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="' + NS + 'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>']);
    /* 모양: 0 기본 / 1 머리글(굵게·회색 바탕) / 2 본문(위쪽 맞춤) / 3 긴 글(위쪽 맞춤·줄바꿈) */
    files.push(['xl/styles.xml', X + '<styleSheet xmlns="' + NS + 'spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF111111"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>']);
    sheets.forEach(function (s, i) { files.push(['xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(s)]); });
    return zip(files);
  }

  root.BakView = { build: build, xlsx: xlsx, apps: ORDER };
})(typeof window !== 'undefined' ? window : globalThis);
