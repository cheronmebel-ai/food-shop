const CACHE = 'food-shop-v2';
const ASSETS = ['/', '/index.html', '/account.html', '/manifest.json', '/icon-192.png'];

self.addEventListener('install',  e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Never intercept: API calls, admin pages, chrome-extension, non-GET
  if (e.request.method !== 'GET') return;
  if (url.includes('/api/')) return;
  if (url.includes('/admin')) return;
  if (url.startsWith('chrome-extension')) return;
  if (!url.startsWith('http')) return;
  // For everything else: cache-first, fallback to network
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/'))));
});

self.addEventListener('push', e => {
  let d = { title:'🍕 Уведомление', body:'', url:'/', unread:0, silent:false };
  if (e.data) { try { d={...d,...e.data.json()}; } catch { d.body=e.data.text(); } }
  if (d.silent) return;
  const title = d.unread>0 ? `(${d.unread}) ${d.title}` : d.title;
  const body  = d.unread>1 ? `${d.body}\n📬 Непрочитанных: ${d.unread}` : d.body;
  e.waitUntil(self.registration.showNotification(title, {
    body, icon:'/icon-192.png', badge:'/icon-192.png', vibrate:[200,100,200],
    tag:'food-push', renotify:true,
    actions:[{action:'open',title:'Открыть'},{action:'dismiss',title:'Закрыть'}],
    data:{ url:d.url||'/' }
  }));
});

self.addEventListener('message', e => {
  if (e.data?.type==='SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title||'🍕', {
      body:e.data.body||'', icon:'/icon-192.png', badge:'/icon-192.png',
      vibrate:[150,75,150], tag:'food-local', renotify:true, data:{url:'/'}
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action==='dismiss') return;
  const url = e.notification.data?.url||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    const w = list.find(c=>c.url.includes(self.location.origin)&&'focus' in c);
    if (w) { w.postMessage({type:'RESET_UNREAD'}); return w.focus(); }
    return clients.openWindow(url);
  }));
});
