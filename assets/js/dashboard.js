
async function loadJSON(path){const r=await fetch(path);return r.json()}
function countByCategory(items){const m={};for(const i of items)m[i.category]=(m[i.category]||0)+1;return m}
(async function(){const kL=document.getElementById("kpiListings"),kA=document.getElementById("kpiAffiliate"),kC=document.getElementById("kpiCategories"),kK=document.getElementById("kpiClicks"),rT=document.getElementById("resourcesTable"),cT=document.getElementById("clicksTable"),sT=document.getElementById("submissionTable"),catT=document.getElementById("categoryTable");
const resources=await loadJSON("data/resources.json");const categories=countByCategory(resources);let clicks=[],subs=[];try{clicks=JSON.parse(localStorage.getItem("netrunna_clicks")||"[]")}catch{}try{subs=JSON.parse(localStorage.getItem("netrunna_submissions")||"[]")}catch{}
kL.textContent=resources.length;kA.textContent=resources.filter(r=>r.use_affiliate).length;kC.textContent=Object.keys(categories).length;kK.textContent=clicks.length;
rT.innerHTML=resources.slice(0,20).map(r=>`<tr><td>${r.title}</td><td>${r.category}</td><td>${r.use_affiliate?"Yes":"No"}</td><td>${r.rating.toFixed(1)}</td><td>${r.views}</td></tr>`).join("");
cT.innerHTML=clicks.slice().reverse().slice(0,20).map(c=>`<tr><td>${c.title}</td><td>${c.category}</td><td>${c.affiliate?"Yes":"No"}</td><td>${new Date(c.timestamp).toLocaleString()}</td></tr>`).join("")||'<tr><td colspan="4">No local click data yet.</td></tr>';
sT.innerHTML=subs.slice().reverse().slice(0,20).map(s=>`<tr><td>${s.title}</td><td>${s.category}</td><td>${s.url}</td><td>${new Date(s.timestamp).toLocaleString()}</td></tr>`).join("")||'<tr><td colspan="4">No local submissions stored yet.</td></tr>';
catT.innerHTML=Object.entries(categories).map(([c,n])=>`<tr><td>${c}</td><td>${n}</td></tr>`).join("");
})();
