/* 동그라미 마쓰야마 여행 — service worker
   index.html 을 고친 뒤 캐시를 확실히 비우려면 아래 VERSION 숫자를 올리세요. */
const VERSION = 'v30';
const CACHE = 'matsuyama-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 아이콘 하나가 없어도 설치가 실패하지 않도록 개별 추가
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 같은 출처 GET 은 stale-while-revalidate:
   캐시를 바로 보여주고 뒤에서 새로 받아둡니다. 다음 실행 때 최신 내용이 보입니다. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });

    const fetching = fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    if (cached) return cached;

    const fresh = await fetching;
    if (fresh) return fresh;

    // 오프라인이고 캐시에도 없음 → 네비게이션이면 앱 셸로 대체
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('오프라인입니다.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});
