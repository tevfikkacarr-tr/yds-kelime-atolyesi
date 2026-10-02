/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= YARDIMCILAR ================= */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pct=x=>Math.round(x*100);
const exHtml=w=>esc(w.ex).replace(/\*([^*]+)\*/,"<mark>$1</mark>");
const clsOf=w=>{if(w.g[0]==="l")return"link";const p=w.pos.split("/")[0];return p.startsWith("adj")?"adj":p.startsWith("adv")?"adv":p.startsWith("n")?"n":"v"};
const posCls=p=>p.startsWith("adj")?"adj":p.startsWith("adv")?"adv":p.startsWith("n")?"n":"v";
function trKeys(w){return new Set((w.tr+" / "+(w.tr2||"")).toLocaleLowerCase("tr-TR").split(/[\/,;()]/).map(s=>s.trim().split(" ")[0]).filter(s=>s.length>3))}
function trOverlap(a,b){const A=trKeys(a);for(const k of trKeys(b))if(A.has(k))return true;return false}
const isFav=id=>S.fav.includes(id);
const isLink=w=>w.g[0]==="l";
function famForms(w){const k=clsOf(w);const out=[];for(const [f,p] of w.fam){if(f===w.w||p.includes("pl"))continue;if(p.split("/").some(x=>posCls(x)===k))continue;if(!out.includes(f))out.push(f)}return out.slice(0,3)}
function bump(o,k,ok){(o[k]=o[k]||{c:0,w:0})[ok?"c":"w"]++}
const accOf=x=>x&&x.c+x.w?x.c/(x.c+x.w):null;
function dayRec(t){t=t??today();const d=S.days[t]||(S.days[t]={n:0,r:0,q:0,c:0,m:0});d.sk=d.sk||{};d.g=d.g||{};return d}

