const CACHE_NAME = 'fasteat-v2';
const APP_SHELL_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/fasteat-180.png',
    '/icons/fasteat-192.png',
    '/icons/fasteat-512.png'
];

const shouldBypassCache = (pathname) => {
    return (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/webpack-hmr') ||
        pathname.startsWith('/__nextjs')
    );
};

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;
    if (shouldBypassCache(requestUrl.pathname)) return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cachedHome = await caches.match('/');
                return cachedHome || Response.error();
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }

                    return response;
                })
                .catch(() => cachedResponse || Response.error());

            return cachedResponse || networkFetch;
        })
    );
});
