/*! config.js v1 - 모든 앱이 함께 쓰는 설정 (mnmn 저장소)
 * 공개돼도 되는 값만 넣으세요. 비밀 키(service_role 등)는 절대 넣지 마세요.
 * 앱에서: <script src="https://jjojjolonglong-sudo.github.io/mnmn/config.js"></script>  (core.v1.js·media.js보다 먼저)
 * 값이 바뀌면 이 파일만 고치면 됩니다. 이미 배포한 v1 파일의 규칙은 바꾸지 말고, 큰 변경은 config.v2.js로 새로 만드세요.
 */
(function (root) {
  var C = root.APP_CONFIG = {
    SB: 'https://rtvvajhsnwkkrmncyfbs.supabase.co',
    ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dnZhamhzbndra3JtbmN5ZmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjkwMTEsImV4cCI6MjEwNzA0NTAxMX0.O2aLLeazv_FhUhbVAkp4vz3pw8GPb_683dUu7Et1Cwk',
    MEDIA: 'https://media.jjojjolonglong.workers.dev',
    FSFS_ASSETS: 'https://fsfs-assets.jjojjolonglong.workers.dev',
    TZ: 'Asia/Seoul'
  };
  /* 한국 시간 기준 날짜(YYYY-MM-DD). 인자가 없으면 오늘, Date나 시각(문자열·숫자)을 주면 그 시각의 한국 날짜.
     한국은 서머타임이 없어 항상 UTC+9라서 덧셈으로 계산해요(달력처럼 수천 번 불러도 빠름) */
  root.kstDate = function (d) {
    var t = d == null ? Date.now() : (d instanceof Date ? d.getTime() : new Date(d).getTime());
    return isNaN(t) ? '' : new Date(t + 32400000).toISOString().slice(0, 10);
  };
  root.todayKST = function () { return root.kstDate(); };
})(typeof window !== 'undefined' ? window : globalThis);
