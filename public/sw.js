/* fishing-pwa 离线缓存 v14
 * HTML(导航请求)：网络优先（no-cache 强制校验新鲜度），离线回退缓存
 * 其余资源：缓存优先（版本随 CACHE 递增整体换新）
 */
const CACHE = 'fishing-v44';
const ASSETS = ['./','index.html','style.css','fish-data.js','fish-art.js','game.js','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','fish-sprites/liyu.webp','fish-sprites/guiyu.webp','fish-sprites/heiyu.webp','fish-sprites/caoyu.webp','fish-sprites/angler.webp','fish-sprites/jiyu.webp','fish-sprites/nianyu.webp','fish-sprites/qingyu.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => {
  if(e.request.mode === 'navigate'){
    e.respondWith(
      // 注意：fetch(e.request) 对 navigate 模式请求会抛 TypeError，必须用 URL 重建普通请求
      fetch(new Request(e.request.url, {cache:'no-cache'})).then(r => {
        if(r && r.status === 200){
          const copy = r.clone();
          caches.open(CACHE).then(c=>c.put('./', copy)).catch(()=>{});
        }
        return r;
      }).catch(()=>caches.match('./'))
    );
    return;
  }
  // 2026-11-03 修复：跨域资源（daobox.net.cn/portal.js 等）与 /api/ 接口一律直连网络，不进 SW 缓存
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.startsWith('/api/')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
