// Service Worker for ChanFM Website
// Cache static resources for faster loading

const CACHE_NAME = 'chanfm-v1.0.0';
const CACHE_STRATEGY = 'cache-first';

// Resources to cache immediately
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/getting-started.html',
    '/styles.css',
    '/script.js',
    '/404.html',
    // External resources (will be cached when fetched)
];

// Resources to cache when accessed
const RUNTIME_CACHE = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
];

// Install event - cache critical resources
self.addEventListener('install', event => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests except for known CDNs
    if (url.origin !== location.origin && !isAllowedOrigin(url.origin)) {
        return;
    }

    event.respondWith(
        handleRequest(request)
    );
});

// Handle different types of requests
async function handleRequest(request) {
    const url = new URL(request.url);

    try {
        // Strategy for HTML pages
        if (request.headers.get('Accept')?.includes('text/html')) {
            return await networkFirst(request);
        }

        // Strategy for static assets
        if (isStaticAsset(url.pathname)) {
            return await cacheFirst(request);
        }

        // Strategy for external resources
        if (url.origin !== location.origin) {
            return await cacheFirst(request);
        }

        // Default to network first
        return await networkFirst(request);

    } catch (error) {
        console.error('[SW] Request failed:', request.url, error);

        // Return fallback for HTML requests
        if (request.headers.get('Accept')?.includes('text/html')) {
            return await caches.match('/404.html') || new Response('Page not found', { status: 404 });
        }

        return new Response('Resource not available', { status: 503 });
    }
}

// Cache first strategy - good for static assets
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        // Update cache in background
        updateCacheInBackground(request);
        return cachedResponse;
    }

    return await fetchAndCache(request);
}

// Network first strategy - good for HTML pages
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            await updateCache(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// Fetch and cache a request
async function fetchAndCache(request) {
    const response = await fetch(request);

    if (response.ok) {
        await updateCache(request, response.clone());
    }

    return response;
}

// Update cache with new response
async function updateCache(request, response) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
}

// Update cache in background (for cache-first strategy)
function updateCacheInBackground(request) {
    fetch(request)
        .then(response => {
            if (response.ok) {
                return updateCache(request, response);
            }
        })
        .catch(error => {
            console.log('[SW] Background update failed:', request.url);
        });
}

// Check if origin is allowed for caching
function isAllowedOrigin(origin) {
    const allowedOrigins = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com'
    ];

    return allowedOrigins.includes(origin);
}

// Check if path is a static asset
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Handle messages from main thread
self.addEventListener('message', event => {
    const { type, payload } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_CACHE_SIZE':
            getCacheSize()
                .then(size => {
                    event.ports[0]?.postMessage({ size });
                });
            break;

        case 'CLEAR_CACHE':
            clearCache()
                .then(() => {
                    event.ports[0]?.postMessage({ success: true });
                });
            break;
    }
});

// Get total cache size
async function getCacheSize() {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    let totalSize = 0;

    for (const request of requests) {
        try {
            const response = await cache.match(request);
            if (response) {
                const text = await response.text();
                totalSize += new Blob([text]).size;
            }
        } catch (error) {
            // Skip problematic responses
        }
    }

    return totalSize;
}

// Clear all caches
async function clearCache() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
}

// Periodic cache cleanup (every 24 hours)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(performCacheCleanup());
    }
});

async function performCacheCleanup() {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    // Remove expired entries (older than 7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const now = Date.now();

    for (const request of requests) {
        try {
            const response = await cache.match(request);
            const dateHeader = response?.headers.get('date');

            if (dateHeader) {
                const responseDate = new Date(dateHeader).getTime();
                if (now - responseDate > maxAge) {
                    await cache.delete(request);
                    console.log('[SW] Removed expired cache entry:', request.url);
                }
            }
        } catch (error) {
            console.error('[SW] Cache cleanup error:', error);
        }
    }
}

console.log('[SW] Service Worker loaded');