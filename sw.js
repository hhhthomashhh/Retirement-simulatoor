const VERSION='retirement-4.1.0-dev-1';
const CACHE=VERSION+'-'+self.registration.scope;
const SHELL=["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "optimizer/core-v403.js", "optimizer/engine.js", "optimizer/legacy-ui.js", "optimizer/legacy.css", "optimizer/optimizer.css", "optimizer/optimizer.js", "optimizer/storage.js", "optimizer/ui.js", "optimizer/worker.js"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('retirement-')&&k.endsWith(self.registration.scope)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r;}catch(error){return (await c.match(e.request))||Response.error();}})());});
