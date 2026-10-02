/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= DURUM VE GEÇİŞ ================= */
const DATA_VERSION=5;
/* Algoritma sürümü: her tekrar olayı hangi zamanlayıcıyla üretildiğini kaydeder (v4 dönemi = scheduler-v1). */
const ALG="scheduler-v2";
const REL=CONTENT.rel||{};
const relOf=(a,b)=>REL[a<b?a+"~"+b:b+"~"+a]||null;
const REL_TR={strong:"güçlü eş anlam",near:"yakın anlam",context:"bağlama bağlı",intensity:"farklı yoğunluk",grammar:"farklı dil bilgisi"};
const KEY="ydsKelimeAtolyesi",OLDKEY="ydsKelimeAtolyesi.v1";   // anahtar adları sürümler arasında DEĞİŞMEZ
/* Depolama adaptörü: şimdilik yalnızca LocalStorageAdapter (src/lib/storage/adapter.ts). İleride CloudStorageAdapter eklenebilir. */
const STORE=(typeof globalThis!=="undefined"&&globalThis.__YDS_STORE)||{get:k=>localStorage.getItem(k),set:(k,v)=>localStorage.setItem(k,v),remove:k=>localStorage.removeItem(k)};
let SAVE_ERROR=null;
function logCritical(kind,e){try{console.error("[YDS] "+kind,e)}catch(x){}}
function today(){const d=new Date();return Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/86400000)}
function emptyErr(){return{mean:{c:0,w:0},syn:{c:0,w:0},ctx:{c:0,w:0},coll:{c:0,w:0},fam:{c:0,w:0},conf:{c:0,w:0}}}
function blankState(){return{dataVersion:DATA_VERSION,cards:{},days:{},streak:0,best:0,last:null,grp:{},err:emptyErr(),conf:{},
  settings:{newPerDay:15,length:"normal",theme:"system",recall:"auto"},doneDay:null,noNewDay:null,fav:[],queue:[],mini:[],
  self:{know:{n:0,ok:0},unsure:{n:0,ok:0},dunno:{n:0,ok:0},knowCtx:{n:0,ok:0},verify:{n:0,ok:0}},hardFollow:{n:0,ok:0},
  ctxLevel:1,ctxRecent:[],bankSeen:[],readDone:{},clozeDone:{},trapStats:{c:0,w:0},deferred:0,weeklySeen:null,
  /* v4 */ qstats:{},readLevel:1,readHist:[],readSess:0,spacing:{easy:1,good:1,hard:1},spStats:{easy:{n:0,ema:.92},good:{n:0,ema:.88},hard:{n:0,ema:.8}},
  hardStats:{d1:{n:0,ok:0},d3:{n:0,ok:0},d7:{n:0,ok:0}},forgotMastered:0,connDim:{},profile:null,placement:null,placeKnown:[],firstNew:null,
  /* v5 */ alg:ALG,algHistory:[],ev:[],dailyStats:{},calib:[0,1,2,3,4].map(()=>({n:0,ok:0,ps:0})),brier:{n:0,sum:0},sessLog:[],
  schedWin:{easy:{n:0,ok:0},good:{n:0,ok:0},hard:{n:0,ok:0}},schedTot:{easy:{n:0,ok:0},good:{n:0,ok:0},hard:{n:0,ok:0}},schedLog:[],
  rtStats:{n:0,sum:0,dropped:0},transfer37:{n:0,ok:0},surpriseStats:{n:0,ok:0},fragileStats:{n:0,ok:0},
  /* kalibrasyon dönemi (eklemeli alanlar; veri sürümü v5 kalır) */ calStart:null,schedLast:{},ratingGap:{},rtNext:{},gapTrack:{},gapStats:{RG:{n:0,resolved:0},RC:{n:0,resolved:0,before:0,after:0}},
  leechRec:{d1:{n:0,ok:0},d3:{n:0,ok:0},d7:{n:0,ok:0}},leechRest:0,mastCheck:{},quadHist:[],delayed:{c:0,w:0},immediate:{c:0,w:0},mocks:[],flags:[],wrongPicks:{},perfLog:[]}}
function cardDefaults(){const t=today();return{step:0,due:t,reps:0,lapses:0,correct:0,wrong:0,first:t,last:null,hist:[],cdays:[],sk:{},rat:[],lastCorrect:null,confErr:0,masteredOn:null,stab:0,lastRev:null,exp:{},hardPending:false,hardAt:null,relearn:false,forgot:0,cm:{},
  rt:null,rtn:0,tr:{},stableOn:null,surpr:[],leechShown:null,rtB:null,trI:null,trD:null,leechTrack:null,restUntil:null}}
function migrate(o){
  if(!o||typeof o!=="object"||!o.cards||typeof o.cards!=="object"||Array.isArray(o.cards))throw new Error("Bu veri YDS Kelime Atölyesi ilerlemesine benzemiyor.");
  let v=o.dataVersion==null?1:o.dataVersion;
  if(typeof v!=="number"||!isFinite(v))throw new Error("Veri sürümü (dataVersion) geçersiz.");
  if(v>DATA_VERSION)throw new Error(`Bu yedek daha yeni bir sürümden (v${v}). Uygulamanın bu sürümü v${DATA_VERSION}'e kadar okuyabilir.`);
  if(v<2){
    const n=blankState();
    for(const id in o.cards){const c=o.cards[id];n.cards[id]=Object.assign(cardDefaults(),c,{hist:[],cdays:c.correct>0&&c.last!=null?[c.last]:[],sk:{},rat:[],lastCorrect:c.correct>0?c.last:null,confErr:0,masteredOn:null})}
    n.days=o.days||{};n.streak=o.streak||0;n.last=o.last??null;n.doneDay=o.doneDay??null;
    const GM={artmak:"increase",azalmak:"decrease",onemli:"important",sebep:"cause",engel:"prevent",koru:"maintain",elde:"achieve",goster:"show",arastir:"research",degis:"change",sifat:"amount"};
    for(const g in o.grp||{}){const k=GM[g];if(k){n.grp[k]=n.grp[k]||{c:0,w:0};n.grp[k].c+=o.grp[g].c||0;n.grp[k].w+=o.grp[g].w||0}}
    const TM={mean:"mean",syn:"syn",ctx:"ctx",guess:"ctx"};
    for(const t in o.typ||{}){const k=TM[t];if(k){n.err[k].c+=o.typ[t].c||0;n.err[k].w+=o.typ[t].w||0}}
    n.conf=o.conf||{};
    n.settings.newPerDay=(o.newPerDay&&o.newPerDay!==12)?o.newPerDay:15;
    n.dataVersion=2;o=n;v=2;
  }
  if(v<3){
    // v2 → v3: hafıza gücü (stab), son tekrar günü, en iyi seri ve yeni alanlar
    for(const id in o.cards){const c=o.cards[id];
      if(c.stab==null||!(c.stab>0))c.stab=c.reps>0?Math.max(.5,LAD[Math.min(7,Math.max(0,c.step|0))]*1.5):0;
      if(c.lastRev==null)c.lastRev=c.last!=null?c.last:(c.reps>0?c.first:null);
      if(!c.exp||typeof c.exp!=="object")c.exp={};
      if(c.hardPending==null)c.hardPending=false;
    }
    o.best=Math.max(o.best||0,o.streak||0);
  }
  if(v<4){
    // v3 → v4: soru tanışıklığı (eski bankSeen'den), okuma seviyesi, kişisel aralıklar, Hard takibi; mevcut kullanıcılar için karşılama atlanır
    const qs={};for(const id of o.bankSeen||[])qs[id]={n:1,last:null,c:0,w:0,lastOk:null};
    o.qstats=Object.assign(qs,o.qstats||{});
    if(!o.profile&&(Object.keys(o.cards).length||Object.keys(o.days||{}).length))o.profile={skipped:true};
  }
  if(v<5){
    // v4 → v5: olay günlüğü, tahmin kalibrasyonu, oturum günlüğü; geçmiş veriler scheduler-v1 ile üretildi olarak işaretlenir
    o.algHistory=(o.algHistory||[]).concat([{v:"scheduler-v1",to:today()}]);o.alg=ALG;
    for(const id in o.cards){const c=o.cards[id];if(c.masteredOn!=null&&c.stableOn==null&&today()-c.masteredOn>=45)c.stableOn=c.masteredOn+45}
  }
  const b=blankState();
  for(const k in b)if(o[k]===undefined)o[k]=b[k];
  o.settings=Object.assign(b.settings,o.settings||{});
  o.err=o.err||{};for(const k in b.err)o.err[k]=Object.assign({c:0,w:0},o.err[k]||{});
  o.self=Object.assign(b.self,o.self||{});
  o.spacing=Object.assign(b.spacing,o.spacing||{});o.spStats=Object.assign(b.spStats,o.spStats||{});o.hardStats=Object.assign(b.hardStats,o.hardStats||{});
  if(!o.qstats||typeof o.qstats!=="object")o.qstats={};if(!Array.isArray(o.readHist))o.readHist=[];if(!Array.isArray(o.placeKnown))o.placeKnown=[];
  o.readLevel=Math.min(2,Math.max(0,o.readLevel??1));
  if(!Array.isArray(o.ev))o.ev=[];if(!o.dailyStats||typeof o.dailyStats!=="object")o.dailyStats={};if(!Array.isArray(o.sessLog))o.sessLog=[];
  if(!Array.isArray(o.calib)||o.calib.length!==5)o.calib=b.calib;o.schedWin=Object.assign(b.schedWin,o.schedWin||{});o.schedTot=Object.assign(b.schedTot,o.schedTot||{});
  o.alg=ALG;
  for(const id in o.cards)o.cards[id]=Object.assign(cardDefaults(),o.cards[id]);
  if(!Array.isArray(o.fav))o.fav=[];if(!Array.isArray(o.queue))o.queue=[];if(!Array.isArray(o.mini))o.mini=[];if(!Array.isArray(o.ctxRecent))o.ctxRecent=[];if(!Array.isArray(o.bankSeen))o.bankSeen=[];
  o.ctxLevel=Math.min(3,Math.max(1,o.ctxLevel|0||1));
  o.best=Math.max(o.best||0,o.streak||0);
  o.dataVersion=DATA_VERSION;
  return o;
}
/* Yedek doğrulama: hatalı yedek mevcut veriyi asla bozmaz (kopya üzerinde çalışır). */
function validateBackup(text){
  let o;try{o=JSON.parse(text)}catch(e){throw new Error("Metin geçerli bir JSON değil. Yedeğin tamamını kopyaladığından emin ol.")}
  if(!o||typeof o!=="object")throw new Error("Yedek bir nesne değil.");
  const data=o.data&&typeof o.data==="object"?o.data:o;
  if(data.dataVersion!=null&&(typeof data.dataVersion!=="number"||!isFinite(data.dataVersion)))throw new Error("dataVersion alanı sayı değil.");
  if(!data.cards||typeof data.cards!=="object"||Array.isArray(data.cards))throw new Error("Zorunlu alan eksik: cards.");
  for(const id in data.cards){const c=data.cards[id];
    if(!c||typeof c!=="object")throw new Error(`“${id}” kartı bozuk.`);
    for(const f of ["step","due","reps"])if(typeof c[f]!=="number"||!isFinite(c[f]))throw new Error(`“${id}” kartında zorunlu alan eksik ya da hatalı: ${f}.`);
  }
  if(data.mini!=null&&!Array.isArray(data.mini))throw new Error("mini alanı liste olmalı.");
  if(data.days!=null&&typeof data.days!=="object")throw new Error("days alanı hatalı.");
  if(o.dataVersion>=5){for(const f of ["questionStats","dailyStats","calibrationStats"])if(o[f]!=null&&typeof o[f]!=="object")throw new Error(`${f} alanı hatalı.`);
    if(typeof o.algorithmVersion!=="string")throw new Error("algorithmVersion alanı eksik.")}
  if(data.ev!=null&&!Array.isArray(data.ev))throw new Error("ev alanı liste olmalı.");
  const raw=JSON.parse(JSON.stringify(data));
  if(o.questionStats&&typeof o.questionStats==="object"&&!raw.qstats)raw.qstats=o.questionStats;
  if(o.dailyStats&&typeof o.dailyStats==="object"&&!raw.dailyStats)raw.dailyStats=o.dailyStats;
  const m=migrate(raw);
  let unknown=0;for(const id in m.cards)if(!BY[id]){unknown++;delete m.cards[id]}
  const n=Object.keys(m.cards).length;
  return{state:m,summary:`${n} kelimenin ilerlemesi, ${m.fav.length} favori ve ${m.mini.length} Mini YDS sonucu bulundu (veri sürümü v${data.dataVersion||1} → v${DATA_VERSION})${unknown?`; havuzda olmayan ${unknown} kayıt atlandı`:""}.`};
}
function learningState(){const t=today(),sm=statusMap(),o={};for(const id in S.cards){if(!BY[id])continue;const tf=transferScore(id);o[id]={s:sm[id],m:masteryScore(id,t),tr:tf?tf.score:null,p:Math.round(100*recallProbability(id,t))/100,tags:[...wordTags(id)]}}return o}
/* Yedek: ham kişisel veri çoğaltılmaz. Soru ve günlük istatistikler yalnızca üst düzeyde tutulur; 30 günden eski ayrıntılı olaylar özet olarak yazılır. */
function exportText(){
  flush();const data=JSON.parse(JSON.stringify(S));const daily=JSON.parse(JSON.stringify(S.dailyStats||{}));
  const lim=today()-30,keep=[];
  for(const e of data.ev||[]){const d=evDay(e[0]);if(d>=lim){keep.push(e);continue}const x=daily[d]||(daily[d]={e:{},q:0,c:0,rt:0,rtn:0});const ty=EVT[e[1]]||"?";x.e[ty]=(x.e[ty]||0)+1;if(ty==="questionCorrect"||ty==="questionWrong"){x.q++;if(ty==="questionCorrect")x.c++}if(e[6]!=null){x.rt+=e[6];x.rtn++}}
  data.ev=keep;delete data.qstats;delete data.dailyStats;
  return JSON.stringify({app:"YDS Kelime Atölyesi",dataVersion:DATA_VERSION,algorithmVersion:ALG,exportedAt:new Date().toISOString(),
    learningState:learningState(),questionStats:S.qstats,dailyStats:daily,
    calibrationStats:{calib:S.calib,brier:S.brier,schedWin:S.schedWin,schedTot:S.schedTot,spacing:S.spacing,schedLog:S.schedLog,hardStats:S.hardStats,ratingGap:S.ratingGap,rtNext:S.rtNext,gapStats:S.gapStats,leechRec:S.leechRec,mastCheck:S.mastCheck,delayed:S.delayed,immediate:S.immediate},
    realUserCalibration:realCalibration(),report30:calDay()>=30?report30():null,data})}
/* Yükleme: okunamayan veri ASLA üzerine yazılmaz; önce ayrı bir anahtara kopyalanır. */
function load(){
  let raw=null;
  try{raw=STORE.get(KEY)}catch(e){logCritical("storage read error",e)}
  if(raw){try{return migrate(JSON.parse(raw))}catch(e){logCritical("migration error",e);try{STORE.set(KEY+".corrupt-"+Date.now(),raw)}catch(x){}}}
  try{const r=STORE.get(OLDKEY);if(r){const m=migrate(JSON.parse(r));try{STORE.set(KEY,JSON.stringify(m))}catch(e){}return m}}catch(e){logCritical("legacy migration error",e)}
  return blankState();
}
/* Kontrollü yazma: değişiklikler 400 ms içinde toplanıp tek seferde yazılır. */
let REV=0,saveTimer=null;
function save(){REV++;if(saveTimer)return;saveTimer=setTimeout(flush,400)}
function flush(){
  if(saveTimer){clearTimeout(saveTimer);saveTimer=null}
  try{STORE.set(KEY,JSON.stringify(S));SAVE_ERROR=null}
  catch(e){   // kota dolarsa: eski ayrıntılı olayları özetleyip bir kez daha dene
    try{if(typeof maintenance==="function"){aggregateEvents(today()-7)}STORE.set(KEY,JSON.stringify(S));SAVE_ERROR=null}catch(e2){SAVE_ERROR=String(e2&&e2.message||e2);logCritical("storage write error",e2)}}
  try{if(typeof sessionSnapshot==="function"){const snap=sessionSnapshot();if(snap)STORE.set(KEY+".session",snap);else STORE.remove(KEY+".session")}}catch(e){}
}
let S=load();
let tab="home",SS=null,sheet=null,wf="all",wq="",wlimit=120,summary=null;
const MEMO={};
function memo(k,fn){const key=k+"|"+REV+"|"+today();if(MEMO[k]&&MEMO[k].key===key)return MEMO[k].v;const v=fn();MEMO[k]={key,v};return v}

