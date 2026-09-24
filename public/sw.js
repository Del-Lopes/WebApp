// Versão sobe a cada mudança visual grande, para o PWA instalado não ficar
// preso ao CSS antigo (v2: redesign com tema escuro/claro; v3: estratégias
// por tipo de recurso).
const CACHE_NAME = 'afk-trade-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate SW: apaga caches de versões anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

// Só guarda respostas completas da própria origem. Opaque/erro no cache
// viraria uma tela quebrada "permanente" até a próxima versão do SW.
function isCacheable(response) {
  // redirected: navegador recusa servir resposta redirecionada a uma navegação.
  return response && response.ok && response.type === 'basic' && !response.redirected;
}

function putInCache(request, response) {
  const method = typeof request === 'string' ? 'GET' : request.method;
  if (method !== 'GET' || !isCacheable(response)) return;
  const copy = response.clone();
  caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

// Navegação: rede primeiro (deploy novo aparece na hora); offline cai no
// index.html em cache, que resolve qualquer rota da SPA.
function handleNavigate(request, url) {
  // Só rotas da SPA recebem o index.html; páginas estáticas (/legal/*.html)
  // não podem sobrescrever o fallback.
  const isSpaRoute = !url.pathname.startsWith('/legal/') && !/\.[a-z0-9]+$/i.test(url.pathname);
  return fetch(request)
    .then((response) => {
      if (isSpaRoute) putInCache('/index.html', response);
      return response;
    })
    .catch(() =>
      caches.match('/index.html')
        .then((cached) => cached || caches.match('/'))
        .then((cached) => cached || Response.error())
    );
}

// /assets/* tem hash no nome: o conteúdo de uma URL nunca muda.
function handleAsset(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      putInCache(request, response);
      return response;
    });
  }).catch(() => Response.error());
}

// Demais arquivos (ícones, manifest, legal...): devolve o cache e atualiza em
// segundo plano.
function handleStaleWhileRevalidate(event) {
  const { request } = event;
  const network = fetch(request)
    .then((response) => {
      putInCache(request, response);
      return response;
    });
  event.waitUntil(network.catch(() => {}));
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return network.catch(() => Response.error());
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // APIs e CDNs de terceiros (Supabase, cotações...) passam direto.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request, url));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(handleAsset(request));
    return;
  }
  event.respondWith(handleStaleWhileRevalidate(event));
});
