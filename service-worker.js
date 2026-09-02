const CACHE='inova-licitacoes-v36.77.0';
const CORE=[
  './','./index.html','./styles.css?v=36.77.0','./app.js?v=36.77.0','./manifest.json?v=36.77.0',
  './assets/logo.png','./assets/papel-timbrado.png','./assets/papel-timbrado-paisagem.pdf','./assets/papel-timbrado-paisagem.png','./icons/icon-192-v2.png?v=36.77.0','./icons/icon-512-v2.png?v=36.77.0'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  // Configuração e navegação sempre tentam a rede primeiro para evitar
  // manter uma URL/chave pública antiga depois de uma publicação.
  const networkFirst=event.request.mode==='navigate' || url.pathname.endsWith('/app-config.js') || /\.(?:js|css|html)$/.test(url.pathname);
  if(networkFirst){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{
          if(response.ok && !url.pathname.endsWith('/app-config.js')){
            caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});
          }
          return response;
        })
        .catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit=>{
      const fresh=fetch(event.request).then(response=>{
        if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});
        return response;
      });
      return hit||fresh;
    })
  );
});
