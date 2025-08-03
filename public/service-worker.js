const CACHE_NAME = 'vibrate-system-v3.0.0';
const STATIC_CACHE_NAME = 'vibrate-static-v3.0.0';
const DYNAMIC_CACHE_NAME = 'vibrate-dynamic-v3.0.0';

// URLs to cache on install
const STATIC_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/manifest.json',
  '/src/styles/globals.css',
  '/src/styles/components.css',
  '/src/styles/themes.css',
  '/src/utils/constants.js',
  '/src/utils/helpers.js',
  '/src/utils/validations.js',
  '/src/services/supabaseClient.js',
  '/src/services/authService.js',
  '/src/services/dataService.js',
  '/src/services/realtimeService.js',
  // FontAwesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  // Vazir Font
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap'
];

// URLs that should always be fetched from network
const NETWORK_FIRST_URLS = [
  '/src/services/',
  '/api/',
  'https://your-project.supabase.co/'
];

// URLs that can be cached dynamically
const CACHEABLE_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_URLS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate event');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// Cache first strategy (for static assets)
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Cache first failed', error);
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html') || createOfflineResponse();
    }
    
    throw error;
  }
}

// Network first strategy (for dynamic content)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200 && shouldCache(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Network first - trying cache', error);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return createOfflineResponse();
    }
    
    throw error;
  }
}

// Stale while revalidate strategy (for API requests)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.log('Service Worker: Stale while revalidate fetch failed', error);
    return null;
  });
  
  return cached || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return STATIC_URLS.some(staticUrl => url.href.includes(staticUrl)) ||
         url.pathname.includes('/icons/') ||
         url.pathname.includes('/fonts/') ||
         CACHEABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
}

function isNetworkFirst(url) {
  return NETWORK_FIRST_URLS.some(networkUrl => url.href.includes(networkUrl));
}

function isAPIRequest(url) {
  return url.pathname.includes('/api/') ||
         url.pathname.includes('/functions/') ||
         url.hostname.includes('supabase.co');
}

function shouldCache(url) {
  const urlObj = new URL(url);
  return !urlObj.pathname.includes('/api/') &&
         !urlObj.hostname.includes('supabase.co') &&
         CACHEABLE_EXTENSIONS.some(ext => urlObj.pathname.endsWith(ext));
}

function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>آفلاین - سیستم ویبره</title>
        <style>
            body {
                font-family: 'Vazirmatn', 'Tahoma', sans-serif;
                margin: 0;
                padding: 2rem;
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }
            .offline-container {
                max-width: 400px;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
            }
            .offline-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                opacity: 0.8;
            }
            h1 { margin-bottom: 1rem; }
            p { margin-bottom: 2rem; opacity: 0.9; }
            .btn {
                background: white;
                color: #2563eb;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                font-size: 1rem;
            }
            .btn:hover {
                background: #f8fafc;
            }
        </style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body>
        <div class="offline-container">
            <div class="offline-icon">
                <i class="fas fa-wifi-slash"></i>
            </div>
            <h1>اتصال اینترنت قطع است</h1>
            <p>متاسفانه در حال حاضر اتصال اینترنت شما قطع است. لطفاً اتصال خود را بررسی کنید.</p>
            <button class="btn" onclick="window.location.reload()">
                <i class="fas fa-redo"></i>
                تلاش مجدد
            </button>
            
            <div style="margin-top: 2rem; font-size: 0.875rem; opacity: 0.7">
                <p>برخی از قابلیت‌های آفلاین در دسترس هستند:</p>
                <ul style="text-align: right; display: inline-block;">
                    <li>ثبت داده‌های جدید</li>
                    <li>مشاهده داده‌های محلی</li>
                    <li>تنظیمات برنامه</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

// Background sync for pending data
self.addEventListener('sync', event => {
  console.log('Service Worker: Sync event', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Import data service and try to sync pending data
    const { default: dataService } = await import('/src/services/dataService.js');
    const result = await dataService.syncToServer();
    console.log('Background sync completed:', result);
    
    // Show notification on successful sync
    if (result.success && result.syncedCount > 0) {
      self.registration.showNotification('همگام‌سازی موفق', {
        body: `${result.syncedCount} رکورد همگام‌سازی شد`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sync-success',
        requireInteraction: false,
        actions: [
          {
            action: 'view',
            title: 'مشاهده',
            icon: '/icons/action-view.png'
          }
        ]
      });
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push event');
  
  const options = {
    body: 'پیام جدید از سیستم ویبره',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'مشاهده',
        icon: '/icons/action-view.png'
      },
      {
        action: 'close',
        title: 'بستن',
        icon: '/icons/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('سیستم ویبره', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?section=view-data')
    );
  }
});

// Message handling
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'periodic-sync') {
    event.waitUntil(doPeriodicSync());
  }
});

async function doPeriodicSync() {
  try {
    console.log('Service Worker: Periodic sync');
    
    // Check for pending data and sync if connected
    const { default: dataService } = await import('/src/services/dataService.js');
    const { default: authService } = await import('/src/services/authService.js');
    
    if (authService.isAuthenticated()) {
      await dataService.syncToServer();
    }
  } catch (error) {
    console.log('Periodic sync failed:', error);
  }
}

// Error handling
self.addEventListener('error', event => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
});

console.log(`Service Worker ${CACHE_NAME} loaded`);