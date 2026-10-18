/*!
 * media.js v1 - 공용 이미지 모듈 (mvmv · bkbk · didi · 관리 앱이 함께 사용)
 *
 * 쓰는 법 (각 앱의 index.html):
 *   <script src="https://<관리앱 도메인>/media.js?v=1"></script>
 *   <script>
 *     Media.init({ getToken: async () => (await sb.auth.getSession()).data.session?.access_token });
 *   </script>
 *
 * 저장 규칙
 *   - 이미지: 세로 200px 기준 WebP 한 장 → images/<원본 해시 16자>.webp   (DB에는 해시 16자만 저장)
 *   - 원본:   didi 일기/카테고리/인덱스, mvmv 장면만. PC에서 폴더가 연결되어 있으면 폴더에 바로 저장,
 *             아니면 inbox/ 에 올려뒀다가 PC에서 Media.sync() 로 폴더에 받아옴 (파일명: <행 id>.<확장자>)
 *
 * 자주 쓰는 함수
 *   Media.url(hash)                  이미지 주소 (hash가 없거나 형식이 다르면 '')
 *   Media.img(hash, 'class="x"')     <img> 태그 문자열
 *   Media.save(file, {id})           리사이즈 + 업로드 (+ id를 주면 원본도 보관) → {hash, previewUrl, bitmap, original, close()}
 *   Media.newId()                    행 id를 미리 만들 때 (원본 파일명으로 쓰므로 업로드 전에 필요)
 *   Media.folder.connect()           로컬 폴더 연결 (버튼 클릭 안에서)
 *   Media.sync()                     inbox의 원본을 로컬 폴더로 받아오기 (버튼 클릭 안에서)
 *   Media.folder.fileUrl(id)         로컬 원본을 크게 볼 때 쓸 임시 주소 (없으면 null)
 *   관리 앱용: Media.list / Media.trash / Media.restore / Media.purge
 */
(function (root) {
  'use strict';

  const SPEC = { height: 200, quality: 0.78, mime: 'image/webp' };   // 규격은 여기 한 곳에서만 바꿔요
  const cfg = { worker: 'https://media.jjojjolonglong.workers.dev', getToken: null };
  const HASH = /^[0-9a-f]{16}$/;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const ORIG_EXT = /^(jpe?g|png|webp|gif|heic|heif|avif)$/;
  const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif' };
  const BATCH = 20;   // Worker가 한 번에 받는 개수

  function init(o) {
    o = o || {};
    if (o.worker) cfg.worker = String(o.worker).replace(/\/$/, '');
    if (o.getToken) cfg.getToken = o.getToken;
    return Media;
  }

  /* ---------- 주소 ---------- */
  const url = (hash) => (HASH.test(hash || '') ? `${cfg.worker}/o/images/${hash}.webp` : '');
  const img = (hash, attrs) => {
    const u = url(hash);
    return u ? `<img src="${u}" loading="lazy" decoding="async" alt="" ${attrs || ''}>` : '';
  };
  const newId = () => root.crypto.randomUUID();

  /* ---------- Worker 호출 ---------- */
  async function api(path, opts) {
    opts = opts || {};
    const t = cfg.getToken ? await cfg.getToken() : '';
    if (!t) throw new Error('로그인이 필요해요');
    try {
      return await fetch(cfg.worker + path, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + t } });
    } catch (e) {
      throw new Error('미디어 Worker에 연결할 수 없어요 (주소/CORS 확인)');
    }
  }
  async function apiJson(path, opts) {
    const r = await api(path, opts);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || 'HTTP ' + r.status);
    return j;
  }
  const post = (path, obj) => apiJson(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

  /* ---------- 해시 / 리사이즈 ---------- */
  // 리사이즈 전 원본 파일의 SHA-256 앞 16자: 같은 사진은 어느 앱에서 올려도 같은 이름이 돼요
  async function hashOf(file) {
    const d = await root.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const canEncodeWebp = () => {
    try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; }
  };

  // 세로 200px 기준으로 줄이기 (키우지 않음, 크롭 없음). 큰 사진은 반씩 단계적으로 줄여서 깨짐을 막아요.
  async function process(file, o) {
    o = o || {};
    const H = o.height || SPEC.height;
    const hash = await hashOf(file);
    let bmp;
    try {
      bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });   // 폰 사진의 회전 정보 반영
    } catch (e) {
      throw new Error('이미지를 읽을 수 없어요 (지원하지 않는 형식일 수 있어요)');
    }
    const k = Math.min(1, H / bmp.height);
    const tw = Math.max(1, Math.round(bmp.width * k)), th = Math.max(1, Math.round(bmp.height * k));
    const draw = (src, w, h) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, w, h);
      return c;
    };
    let src = bmp, sw = bmp.width, sh = bmp.height;
    while (sh / 2 >= th) {
      const w = Math.max(tw, Math.round(sw / 2)), h = Math.max(th, Math.round(sh / 2));
      src = draw(src, w, h); sw = w; sh = h;
    }
    const out = (sw === tw && sh === th && src !== bmp) ? src : draw(src, tw, th);
    const blob = await new Promise((res) => out.toBlob(res, SPEC.mime, o.quality || SPEC.quality));
    if (!blob || blob.type !== SPEC.mime) { bmp.close && bmp.close(); throw new Error('이 브라우저는 WebP 저장을 지원하지 않아요'); }
    const previewUrl = URL.createObjectURL(blob);
    return {
      hash, blob, width: tw, height: th, bytes: blob.size,
      bitmap: bmp,          // 팔레트 추출 등에 그대로 쓸 수 있어요 (drawImage 가능)
      previewUrl,           // 화면 미리보기용
      close() { try { URL.revokeObjectURL(previewUrl); } catch (e) {} bmp.close && bmp.close(); },
    };
  }

  async function upload(p) {
    const fd = new FormData();
    fd.append('hash', p.hash);
    fd.append('file', p.blob, p.hash + '.webp');
    return (await apiJson('/upload', { method: 'POST', body: fd })).hash;
  }

  /* ---------- 로컬 폴더 (PC Chrome/Edge) ---------- */
  const idb = {
    open: () => new Promise((ok, no) => {
      const r = indexedDB.open('media-kit', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    }),
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((ok, no) => {
        const tx = db.transaction('kv', mode), req = fn(tx.objectStore('kv'));
        tx.oncomplete = () => { db.close(); ok(req.result); };
        tx.onerror = () => { db.close(); no(tx.error); };
      });
    },
    get: (k) => idb.run('readonly', (s) => s.get(k)),
    set: (k, v) => idb.run('readwrite', (s) => s.put(v, k)),
    del: (k) => idb.run('readwrite', (s) => s.delete(k)),
  };
  const perm = async (h, ask) => {
    if (typeof h.queryPermission !== 'function') return true;
    if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    return !!ask && (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
  };
  const FILE_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z0-9]{2,5})$/i;
  let idxCache = null;

  const folder = {
    get supported() { return typeof root.showDirectoryPicker === 'function'; },
    async connect() {          // 버튼 클릭 안에서 호출
      const h = await root.showDirectoryPicker({ mode: 'readwrite', id: 'media-originals' });
      return this.setHandle(h);
    },
    async setHandle(h) { await idb.set('dir', h); idxCache = null; return h.name; },
    async saved() { return (await idb.get('dir')) || null; },
    async name() { const h = await this.saved(); return h ? h.name : ''; },
    async forget() { idxCache = null; await idb.del('dir'); },
    async get() {              // 이미 권한이 있을 때만 핸들 반환 (팝업을 띄우지 않음)
      const h = await this.saved();
      return h && (await perm(h, false)) ? h : null;
    },
    async ensure() {           // 권한이 없으면 요청 (반드시 버튼 클릭 안에서 호출)
      const h = await this.saved();
      return h && (await perm(h, true)) ? h : null;
    },
    // 폴더 안의 원본 목록: id → 파일 이름. 같은 id가 여러 개면 가장 최근 파일
    async index(refresh) {
      if (idxCache && !refresh) return idxCache;
      const dir = await this.get();
      const map = new Map();
      if (!dir) return map;
      const dup = new Map();
      for await (const [name, h] of dir.entries()) {
        const m = h.kind === 'file' && name.match(FILE_RE);
        if (!m) continue;
        const id = m[1].toLowerCase();
        (dup.get(id) || dup.set(id, []).get(id)).push(h);
      }
      for (const [id, hs] of dup) {
        if (hs.length === 1) { map.set(id, hs[0].name); continue; }
        let best = null, t = -1;
        for (const h of hs) { const f = await h.getFile(); if (f.lastModified > t) { t = f.lastModified; best = h.name; } }
        map.set(id, best);
      }
      return (idxCache = map);
    },
    async find(id) {           // 로컬 원본 File 또는 null
      const dir = await this.get();
      if (!dir) return null;
      const name = (await this.index()).get(String(id || '').toLowerCase());
      if (!name) return null;
      try { return await (await dir.getFileHandle(name)).getFile(); } catch (e) { return null; }
    },
    async fileUrl(id) {        // 크게 볼 때: <img src>에 쓰고, 다 쓰면 URL.revokeObjectURL
      const f = await this.find(id);
      return f ? URL.createObjectURL(f) : null;
    },
  };

  const extOf = (file) => {
    const m = String(file.name || '').match(/\.([A-Za-z0-9]{2,5})$/);
    const e = (m ? m[1] : MIME_EXT[file.type] || '').toLowerCase();
    if (!ORIG_EXT.test(e)) throw new Error('원본 보관은 jpg/png/webp/gif/heic/heif/avif 만 가능해요');
    return e;
  };
  async function writeLocal(dir, name, blob) {
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
    if ((await fh.getFile()).size !== blob.size) throw new Error('로컬 저장 검증 실패: ' + name);   // 크기가 다르면 실패로 처리
    idxCache = null;
  }

  // 원본 보관: 폴더가 연결되어 있으면 바로 로컬에, 아니면 inbox에. 'local' | 'inbox' 반환
  async function original(id, file) {
    id = String(id || '').toLowerCase();
    if (!UUID.test(id)) throw new Error('원본 보관에는 행 id(uuid)가 필요해요');
    const ext = extOf(file);
    const dir = await folder.get();
    if (dir) { await writeLocal(dir, `${id}.${ext}`, file); return 'local'; }
    const fd = new FormData();
    fd.append('id', id);
    fd.append('file', file, `${id}.${ext}`);
    await apiJson('/inbox', { method: 'POST', body: fd });
    return 'inbox';
  }

  /* ---------- 저장 한 번에: 리사이즈 + 업로드 (+ 원본) ---------- */
  async function save(file, o) {
    o = o || {};
    const p = await process(file, o);
    try { await upload(p); } catch (e) { p.close(); throw e; }
    let orig = null, originalError = '';
    if (o.id) {                // 원본 보관 실패는 이미지 저장 자체를 막지 않고 알려만 줘요
      try { orig = await original(o.id, file); } catch (e) { orig = 'failed'; originalError = e.message; }
    }
    return { hash: p.hash, width: p.width, height: p.height, bytes: p.bytes, bitmap: p.bitmap, previewUrl: p.previewUrl, original: orig, originalError, close: p.close };
  }

  /* ---------- 목록 / 휴지통 (관리 앱, 원본 동기화) ---------- */
  async function list(prefix) {
    const out = [];
    let cursor = '';
    do {
      const j = await apiJson(`/list?prefix=${encodeURIComponent(prefix)}&limit=1000` + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
      out.push(...j.objects);
      cursor = j.cursor || '';
    } while (cursor);
    return out;
  }
  async function chunked(path, keys) {
    const moved = [], missing = [];
    for (let i = 0; i < keys.length; i += BATCH) {
      const j = await post(path, { keys: keys.slice(i, i + BATCH) });
      moved.push(...(j.moved || j.deleted || [])); missing.push(...(j.missing || []));
    }
    return { moved, missing };
  }
  const trash = (keys) => chunked('/trash', keys);        // images/ inbox/ → trash/
  const restore = (keys) => chunked('/restore', keys);    // trash/... → 원래 자리
  const purge = (keys) => chunked('/delete', keys);       // trash/ 안의 파일 영구 삭제

  // inbox에 쌓인 원본 목록: [{key, id, ext, size, uploaded}]
  async function pending() {
    return (await list('inbox/')).map((o) => {
      const m = o.key.match(/^inbox\/([0-9a-f-]{36})\.([a-z0-9]{2,5})$/i);
      return m ? { key: o.key, id: m[1].toLowerCase(), ext: m[2].toLowerCase(), size: o.size, uploaded: o.uploaded } : null;
    }).filter(Boolean);
  }

  // inbox 원본을 로컬 폴더로 받아오고 inbox는 휴지통으로. 저장이 확인된 것만 정리하므로 중간에 끊겨도 안전해요.
  async function sync(o) {
    o = o || {};
    const dir = await folder.ensure();          // 버튼 클릭 안에서 호출해야 권한 팝업이 떠요
    if (!dir) throw new Error('로컬 폴더가 연결되어 있지 않거나 권한이 없어요');
    const items = await pending();
    let done = 0;
    const failed = [];
    for (let i = 0; i < items.length; i += BATCH) {
      const ok = [];
      for (const it of items.slice(i, i + BATCH)) {
        try {
          const r = await api('/o/' + it.key.split('/').map(encodeURIComponent).join('/'));
          if (!r.ok) throw new Error('HTTP ' + r.status);
          await writeLocal(dir, `${it.id}.${it.ext}`, await r.blob());
          ok.push(it.key);
        } catch (e) { failed.push({ key: it.key, error: e.message }); }
        if (o.onProgress) o.onProgress({ done: done + ok.length, failed: failed.length, total: items.length });
      }
      if (ok.length) { await trash(ok); done += ok.length; }
    }
    return { total: items.length, done, failed };
  }

  const Media = {
    version: 1, SPEC, init, url, img, newId, hashOf, canEncodeWebp,
    process, upload, original, save, folder,
    list, trash, restore, purge, pending, sync,
  };
  root.Media = Media;
  if (typeof module !== 'undefined' && module.exports) module.exports = Media;
})(typeof window !== 'undefined' ? window : globalThis);
