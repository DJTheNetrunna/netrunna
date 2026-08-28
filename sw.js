const CACHE="netrunna-shell-v3";
const CORE=[
  "./",
  "./index.html",
  "./about.html",
  "./dashboard.html",
  "./submit.html",
  "./redirect.html",
  "./assets/css/style.css",
  "./assets/js/catalog.js",
  "./assets/js/app.js",
  "./assets/js/dashboard.js",
  "./assets/js/redirect.js",
  "./data/resources.json",
  "./awsomepiracy/readme.md",
  "./awsomepiracy/index.html",
  "./assets/img/favicon.svg",
  "./manifest.webmanifest"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith("netrunna-")).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response})));
});