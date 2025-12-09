// 缓存版本
const CACHE_VERSION = 'v1';
const CACHE_NAME = `live-monitor-${CACHE_VERSION}`;

// 需要缓存的资源
const CACHE_ASSETS = [
  '/index.html',
  '/search.html',
  '/history.html',
  '/hls.html',
  '/room.html',
  '/manifest.json',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://cdn.tailwindcss.com'
];

// ------------------------
// 安装阶段：缓存静态资源
// ------------------------
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching assets...');
        return cache.addAll(CACHE_ASSETS);
      })
      .catch((err) => console.error('[Service Worker] Cache failed:', err))
  );

  // 跳过等待，直接激活新的service worker
  self.skipWaiting();
});

// ------------------------
// 激活阶段：清理旧版本缓存
// ------------------------
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // 立即控制所有客户端
  self.clients.claim();
});

// ------------------------
// 拦截 fetch 请求
// ------------------------
self.addEventListener('fetch', (event) => {
  const requestURL = event.request.url;

  // 对于 API 请求或指定域名，直接走网络
  if (requestURL.includes('/api/') || requestURL.includes('http://113.45.79.245/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ error: '网络连接失败' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
  } else {
    // 静态资源使用缓存优先策略
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // 否则从网络获取并缓存
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));

            return response;
          })
          .catch(() => {
            // 可选：网络失败时返回默认离线页面
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
    );
  }
});

// ------------------------
// 接收来自客户端的消息
// ------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting received');
    self.skipWaiting();
  }
});
