const CACHE="netrunna-shell-v7";
const CORE=[
  "./",
  "./index.html",
  "./awesome.html",
  "./survivor.html",
  "./about.html",
  "./dashboard.html",
  "./submit.html",
  "./redirect.html",
  "./assets/css/style.css",
  "./assets/js/catalog.js",
  "./assets/js/app.js",
  "./assets/js/awesome.js",
  "./assets/js/survivor.js",
  "./assets/js/dashboard.js",
  "./assets/js/redirect.js",
  "./data/resources.json",
  "./data/survivor-library.json",
  "./awsomepiracy/readme.md",
  "./awsomepiracy/index.html",
  "./assets/img/favicon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith("netrunna-")).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

function networkFirst(request){
  return fetch(request,{cache:"no-store"}).then(response=>{
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy));
    }
    return response;
  }).catch(()=>caches.match(request));
}

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  const freshAsset = event.request.mode==="navigate" ||
    /\.(?:html|js|json|md|webmanifest)$/i.test(url.pathname) ||
    url.pathname.endsWith("/sw.js");

  if(freshAsset){
    event.respondWith(networkFirst(event.request).then(response=>response||caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }))
  );
});
