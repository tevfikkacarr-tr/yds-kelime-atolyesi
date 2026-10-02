/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= HAFIZA MODELİ ================= */
/* retrieval strength: şu an hatırlama olasılığı R = e^(−geçen gün / stab).
   storage strength: kelimenin uzun süreli hafızadaki sağlamlığı 1 − e^(−stab/30). */
function retr(c,t){if(!c||c.lastRev==null||!(c.stab>0))return 0;const e=Math.max(0,(t??today())-c.lastRev);return Math.exp(-e/Math.max(.3,c.stab))}
function storageStr(c){return c&&c.stab>0?1-Math.exp(-c.stab/30):0}
function updateStab(c,r){
  const t=today();
  if(!(c.stab>0)||c.lastRev==null){c.stab={again:.4,hard:.8,good:1.5,easy:3}[r];c.lastRev=t;return}
  const same=c.lastRev===t,R=retr(c,t);
  let m;
  if(same)m={again:.7,hard:1,good:1.1,easy:1.2}[r];        // aynı gün tekrar uzun süreli hafızaya az katkı sağlar
  else if(r==="again")m=.45;
  else if(r==="hard")m=1.15;                                 // Hard: yavaş büyüme, unutma hızlı kalır
  else if(r==="good")m=1.6+1.2*(1-R);                        // zor hatırlanan doğru cevap daha çok güçlendirir
  else m=2.3+1.5*(1-R);                                      // Easy: unutma eğrisi en çok yavaşlar
  c.stab=Math.min(400,Math.max(.3,c.stab*m));c.lastRev=t;
}
function quizStab(c,ok){const t=today();if(!(c.stab>0)){c.stab=ok?1:.4;c.lastRev=t;return}if(c.lastRev===t){c.stab=Math.min(400,c.stab*(ok?1.02:.85));return}c.stab=Math.min(400,Math.max(.3,c.stab*(ok?1.1:.75)));c.lastRev=t}

/* masteryScore 0–100: bileşenler kelime tipine göre ağırlıklandırılır, zamanla (retrieval düştükçe) azalır. */
function weightsFor(w){
  if(isLink(w))return{mean:20,syn:10,ctx:50,coll:0,fam:0,ret:20};
  const x={mean:30,syn:20,ctx:25,coll:10,fam:5,ret:10};
  if(!w.col.length){x.ctx+=x.coll;x.coll=0}
  if(famForms(w).length<2){x.mean+=x.fam;x.fam=0}
  if(!w.syn.length){x.ctx+=x.syn;x.syn=0}
  return x;
}
function masteryParts(id,t){
  const c=S.cards[id],w=BY[id];if(!c||!w)return null;
  const sm=k=>{const x=c.sk[k];return x&&x.c+x.w?(x.c+.5)/(x.c+x.w+1):null};
  const h=c.hist.slice(-8);const hm=h.length?(h.reduce((a,b)=>a+b,0)+.5)/(h.length+1):0;
  const skm=sm("mean");const mean=skm==null?hm:(hm*.6+skm*.4);
  const est=v=>v==null?mean*.6:v;
  const R=retr(c,t);
  return{mean,syn:est(sm("syn")),ctx:est(sm("ctx")),coll:est(sm("coll")),fam:est(sm("fam")),ret:.5*Math.min(1,c.cdays.length/4)+.5*storageStr(c),R,storage:storageStr(c)};
}
/* Yumuşak unutma etkisi: son tekrardan bu yana geçen güne göre. Tipik kalıcı kelimede 30 gün ≈ −8%, 60 gün ≈ −15%.
   Easy ile güçlenen (yüksek stab) kelimelerde daha yavaş, Hard ile kalanlarda daha hızlı. Alt sınır %50. */
function decayFactor(c,t){if(!c||c.lastRev==null)return 1;const e=Math.max(0,(t??today())-c.lastRev);return Math.max(.5,Math.exp(-e/(250+8*Math.min(400,c.stab||0))))}
function masteryScore(id,t){
  const p=masteryParts(id,t);if(!p)return 0;
  const w=BY[id],x=weightsFor(w),c=S.cards[id];
  const decay=decayFactor(c,t);
  let s=0;for(const k of ["mean","syn","ctx","coll","fam"])s+=x[k]*p[k]*decay;
  s+=x.ret*p.ret;
  s-=Math.min(10,(c.confErr||0)*2);
  const rs=rtScore(c);if(rs!=null)s+=4*(rs-.5);        // tepki süresi: düşük ağırlıklı yardımcı sinyal (±2)
  return Math.max(0,Math.min(100,Math.round(s)));
}
/* ===== v5: tepki süresi, hatırlama olasılığı, iç etiketler, aktarım ===== */
const RT_MIN=300,RT_MAX=60000,RT_CAP=30000;
function validRt(ms,hidden){if(hidden||ms==null||!isFinite(ms)||ms<RT_MIN||ms>RT_MAX){S.rtStats.dropped++;return null}return Math.min(RT_CAP,ms)}
const RT_B=ms=>ms<3000?"<3":ms<7000?"3–7":ms<15000?"7–15":"15–30";
function noteRt(c,rt){if(rt==null||!c)return;c.rtB={b:RT_B(rt),d:today()};c.rt=c.rt==null?rt:Math.round(.7*c.rt+.3*rt);c.rtn=(c.rtn||0)+1;S.rtStats.n++;S.rtStats.sum+=rt}
function rtScore(c){if(!c||c.rt==null||(c.rtn||0)<2)return null;return 1-Math.min(1,Math.max(0,(c.rt-3000)/15000))}
const sigm=z=>1/(1+Math.exp(-z)),logit=p=>Math.log(p/(1-p));
function smAcc(x,prior){return x&&x.c+x.w?(x.c+(prior??.6))/(x.c+x.w+1):null}
/* recallProbability: bugün hatırlama olasılığı (0–1). Girdiler: retrieval, ustalık, depolama, son puan, Hard geçmişi, son hatalar, tepki süresi, bağlam/eş anlam başarısı. */
function recallProbability(id,t){
  const c=S.cards[id];if(!c||!c.reps&&!c.correct)return 0;
  t=t??today();const R=retr(c,t);
  let z=logit(Math.min(.97,Math.max(.03,R)));
  const ms=masteryScore(id,t);z+=1.1*(ms/100-.5);
  z+=.8*(storageStr(c)-.25);
  const last=c.rat[c.rat.length-1];z+=last==="e"?.35:last==="h"?-.35:last==="a"?-.6:0;
  if(c.hardAt!=null)z-=.25;
  const h=c.hist.slice(-5);if(h.length)z-=1.2*(1-h.reduce((a,b)=>a+b,0)/h.length);
  const rs=rtScore(c);if(rs!=null)z+=.4*(rs-.5);
  const cs=[smAcc(c.sk.ctx),smAcc(c.sk.syn)].filter(x=>x!=null);if(cs.length)z+=.6*(cs.reduce((a,b)=>a+b,0)/cs.length-.6);
  return Math.min(.99,Math.max(.01,sigm(z)));
}
/* Tahmin kalibrasyonu: tahmin edilen olasılık (5 aralık) ile gerçek sonuç karşılaştırılır. */
function calibAdd(p,ok){const i=Math.min(4,Math.floor(p*5));const b=S.calib[i];b.n++;if(ok)b.ok++;b.ps+=p;S.brier.n++;S.brier.sum+=(p-(ok?1:0))**2}
function calibReport(){return S.calib.map((b,i)=>({range:`${i*20}–${i*20+20}`,n:b.n,pred:b.n?b.ps/b.n:null,real:b.n?b.ok/b.n:null}))}
/* Aktarım (Transfer) puanı: kartta bilmenin sınav benzeri sorulara taşınması. Bileşenler: anlam 20, eş anlam 15, bağlam 25, okuma 20, cloze 10, Mini YDS kelime 10. */
const TR_W={mean:20,syn:15,ctx:25,read:20,clz:10,yv:10};
function transferScore(id){
  const c=S.cards[id];if(!c)return null;const tr=c.tr||{};
  const parts={mean:smAcc(c.sk.mean),syn:smAcc(c.sk.syn),ctx:smAcc(c.sk.ctx),read:smAcc(tr.read),clz:smAcc(tr.clz),yv:smAcc(tr.yv)};
  if(parts.mean==null){const h=c.hist.slice(-6);if(h.length)parts.mean=h.reduce((a,b)=>a+b,0)/h.length}
  if(parts.ctx==null&&parts.read==null&&parts.clz==null&&parts.yv==null)return null;
  let s=0,w=0;for(const k in TR_W)if(parts[k]!=null){s+=TR_W[k]*parts[k];w+=TR_W[k]}
  return{score:Math.round(100*s/w),parts};
}
function cnt(x){return x?x.c+x.w:0}
/* İç etiketler (kullanıcıya gösterilmez; zamanlayıcı kullanır) */
function wordTags(id,t){
  return memo("tags:"+id,()=>{
    const c=S.cards[id],out=new Set();if(!c)return out;t=t??today();
    const tr=c.tr||{},h=c.rat.slice(-6).map(x=>x==="g"||x==="e"?1:x==="h"?.5:0);   // doğrudan hatırlama: kart puanları + anlam soruları
    const meanN=cnt(c.sk.mean)+h.length,meanA=meanN?((c.sk.mean?c.sk.mean.c:0)+h.reduce((a,b)=>a+b,0))/meanN:null;
    const use={c:(c.sk.ctx?c.sk.ctx.c:0)+(tr.read?tr.read.c:0)+(tr.clz?tr.clz.c:0),w:(c.sk.ctx?c.sk.ctx.w:0)+(tr.read?tr.read.w:0)+(tr.clz?tr.clz.w:0)};
    const useA=cnt(use)?use.c/cnt(use):null;
    const direct={c:(c.sk.mean?c.sk.mean.c:0),w:(c.sk.mean?c.sk.mean.w:0)};h.forEach(x=>{if(x>=1)direct.c++;else direct.w++});
    if(meanN>=3&&meanA>.85&&cnt(use)>=3&&useA<.6)out.add("RecognitionGap");
    if(cnt(use)>=3&&useA>=.8&&cnt(direct)>=3&&direct.c/cnt(direct)<.6)out.add("RecallGap");
    if(cnt(c.sk.ctx)>=3&&c.sk.ctx.c/cnt(c.sk.ctx)<.6)out.add("ContextWeak");
    if(cnt(c.sk.syn)>=3&&c.sk.syn.c/cnt(c.sk.syn)<.6)out.add("SynonymWeak");
    if(c.due<t-2)out.add("Overdue");
    if(c.masteredOn!=null&&c.stableOn==null&&t-c.masteredOn<45)out.add("FragileMastered");
    if(c.reps+c.correct+c.wrong>=8&&masteryScore(id,t)<45)out.add("Leech");
    return out});
}
function taggedIds(tag){return memo("tagged:"+tag,()=>Object.keys(S.cards).filter(id=>BY[id]&&wordTags(id).has(tag)))}
/* Kişisel karıştırma çiftleri: gerçek hatalardan (her iki yönde toplam ≥ 3) */
const CONF_MIN=3;
function confusionCount(a,b){return((S.conf[a]||{})[b]||0)+((S.conf[b]||{})[a]||0)}
function personalPairs(){
  return memo("ppairs",()=>{const seen=new Set(),out=[];
    for(const a in S.conf)for(const b in S.conf[a]){if(!BY[a]||!BY[b]||a===b)continue;const k=pairKey(a,b);if(seen.has(k)||PAIRMAP[k])continue;seen.add(k);
      const n=confusionCount(a,b);if(n>=CONF_MIN)out.push({ws:[a,b].sort(),n,personal:true,tip:`${a} = ${BY[a].tr.split(" / ")[0]} · ${b} = ${BY[b].tr.split(" / ")[0]}. Bu ikisini ${n} kez karıştırdın; farkı örnek cümlelerde gör.`})}
    return out.sort((x,y)=>y.n-x.n)});
}
function mnemonic(w){
  const tr0=w.tr.split(" / ")[0],syn=w.syn[0],ff=famForms(w)[0];
  return`${w.w} → “${tr0}”${syn?` · yakın: ${syn}`:""}${ff?` · aile: ${ff}`:""}${w.col[0]?` · kalıp: ${w.col[0]}`:""}`;
}
function mastery(c){
  if(!c)return{days:false,syn:false,ctx:false,rat:false};
  const r=c.rat.slice(-3);
  return{days:c.cdays.length>=3,syn:!!(c.sk.syn&&c.sk.syn.c>=1),ctx:!!(c.sk.ctx&&c.sk.ctx.c>=1),rat:r.length>=2&&r.filter(x=>x==="g"||x==="e").length>=2};
}
function criteriaMet(c){const m=mastery(c);return m.days&&m.syn&&m.ctx&&m.rat}
/* Kalıcı: ölçütler + puan ≥ 75 ile girilir; puan 60'ın altına düşerse (unutma) kalıcılıktan çıkar. */
function isMasteredId(id,t){const c=S.cards[id];if(!c||!criteriaMet(c))return false;const s=masteryScore(id,t);return c.masteredOn?s>=60:s>=75}
function weakScore(id){
  const c=S.cards[id];if(!c)return 0;
  const att=c.correct+c.wrong;if(att+c.reps<2)return 0;
  const h=c.hist.slice(-5);const recentErr=h.length?1-h.reduce((a,b)=>a+b,0)/h.length:0;
  const errRate=att?c.wrong/att:0;
  const t=today();const timeF=c.lastCorrect==null?1:Math.min(1,(t-c.lastCorrect)/14);
  const sk=k=>{const x=c.sk[k];return x&&x.c+x.w?x.w/(x.c+x.w):0};
  const s=100*(.30*recentErr+.18*errRate+.10*timeF+.14*sk("ctx")+.12*sk("syn")+.08*Math.min(1,(c.confErr||0)/2)+.08*Math.min(1,c.lapses/3));
  return Math.round(Math.min(100,s));
}
function isWeak(id){const c=S.cards[id];if(!c)return false;return weakScore(id)>=40&&(c.correct+c.wrong>=2||c.lapses>=1)}
function statusOf(id){
  const c=S.cards[id];if(!c)return"new";
  if(isWeak(id))return"weak";
  if(isMasteredId(id))return"mastered";
  if((masteryScore(id)>=50&&c.reps+c.correct>=2)||c.cdays.length>=2||c.step>=2)return"familiar";
  return"learning";
}
function statusMap(){return memo("status",()=>{const m={};for(const w of W)m[w.id]=statusOf(w.id);return m})}
const STATUS={new:"Yeni",learning:"Öğreniliyor",weak:"Zayıf",familiar:"Tanıdık",mastered:"Kalıcı"};
function groupErr(){const o={};for(const g in S.grp){const x=S.grp[g],n=x.c+x.w;if(n>=4)o[g]={err:x.w/n,n}}return o}
function focusGroup(){const e=groupErr();let b=null;for(const g in e){if(GROUPS[g]&&e[g].err>=.3&&(!b||e[g].err>b.err))b={g,err:e[g].err}}return b}
function lapseRate(){let r=0,l=0;for(const id in S.cards){const c=S.cards[id];if(c.reps>1){r+=c.reps-1;l+=c.lapses}}return r>=10?l/r:null}
function weakestSkill(min){let b=null;for(const k in SKILLS){const x=S.err[k],n=x.c+x.w;if(n>=(min||6)){const a=x.c/n;if(!b||a<b.a)b={k,a}}}return b&&b.a<.8?b:null}
function weakList(){return memo("weak",()=>Object.keys(S.cards).filter(id=>BY[id]&&isWeak(id)).sort((a,b)=>weakScore(b)-weakScore(a)))}
function dueList(){const t=today();return Object.keys(S.cards).filter(id=>BY[id]&&S.cards[id].due<=t&&!(S.cards[id].restUntil>t))}
function selfAccuracy(){const v=S.self.verify||{n:0};if(v.n>=5)return v.ok/v.n;const k=S.self.know;return k.n>=5?k.ok/k.n:null}

