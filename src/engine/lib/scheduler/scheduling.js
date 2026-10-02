/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= ZAMANLAMA ================= */
function ensure(id){return S.cards[id]||(S.cards[id]=cardDefaults())}
function nextStep(c,r,fresh,hadAgain){
  if(r==="again")return{step:fresh?0:1,due:1,lapse:!fresh};
  if(r==="hard")return{step:fresh?1:Math.max(1,c.step-1),due:1};
  if(hadAgain)return{step:1,due:1};
  if(r==="good"){const s=fresh?1:Math.min(c.step+1,7);return{step:s,due:LAD[s]}}
  const s=fresh?2:Math.min(c.step+2,7);return{step:s,due:LAD[s]};
}
/* Kişisel tekrar aralıkları: Easy / Good / Hard çarpanları kullanıcının gerçek hatırlama oranına göre yavaşça uyarlanır. */
/* Kalibrasyon güvenlik sınırları: Easy 0,80–1,30 · Good 0,80–1,25 · Hard 0,70–1,15; adım ±%5; aynı çarpan 3 günden sık değişmez */
const SP_TARGET={easy:.92,good:.88,hard:.78},SP_RANGE={easy:[.8,1.3],good:[.8,1.25],hard:[.7,1.15]},SCHED_GAP=3;
const HARD_BASE=s=>s>=5?3:s>=3?2:1;
function personalDue(r,x){if(r==="again")return x.due;const m=S.spacing[r]||1;return Math.max(1,Math.round((r==="hard"?HARD_BASE(x.step):x.due)*m))}
/* Zamanlayıcı kalibrasyonu (scheduler-v2): bir önceki puana göre hedef hatırlama aralıkları.
   Good %80–90, Easy %90+, Hard %60–75. En az 20 örnek birikmeden çarpan değişmez; her değişiklikten sonra pencere yarıya iner. */
const SCHED_TGT={good:[.80,.90],easy:[.90,.97],hard:[.60,.75]},SCHED_MIN=20;
function adaptSpacing(c,r){
  const t=today();if(!c.reps||c.lastRev==null||c.lastRev>=t)return;
  const key={e:"easy",g:"good",h:"hard"}[c.rat[c.rat.length-1]];if(!key)return;
  const ok=r==="good"||r==="easy",st=S.schedWin[key],tot=S.schedTot[key];
  st.n++;if(ok)st.ok++;tot.n++;if(ok)tot.ok++;
  const old=S.spStats[key];old.n++;old.ema=.92*old.ema+.08*(ok?1:0);
  if(st.n<SCHED_MIN)return;
  if(S.schedLast[key]!=null&&t-S.schedLast[key]<SCHED_GAP)return;
  const rate=st.ok/st.n,[lo,hi]=SCHED_TGT[key],[mn,mx]=SP_RANGE[key],from=S.spacing[key];
  let to=from;
  if(rate>hi)to=Math.min(mx,from*1.05);else if(rate<lo)to=Math.max(mn,from*.95);
  if(to!==from){S.spacing[key]=to;S.schedLast[key]=t;
    S.schedLog.push({t,key,from:Math.round(from*100)/100,to:Math.round(to*100)/100,rate:Math.round(rate*100)/100,n:st.n,target:`${pct(lo)}–${pct(hi)}%`,reason:rate>hi?"recall above target":"recall below target",alg:ALG});if(S.schedLog.length>50)S.schedLog.shift();
    st.n=Math.round(st.n/2);st.ok=Math.round(st.ok/2)}
  else if(st.n>=60){st.n=Math.round(st.n/2);st.ok=Math.round(st.ok/2)}
}
/* Hard takibi: Hard verilen kelimenin bir sonraki hatırlanması 1 / 3 / 7 gün kovalarına yazılır. */
function hardTrack(c,ok){
  const t=today();if(c.hardAt==null||t<=c.hardAt)return;
  const g=t-c.hardAt,b=g<=2?"d1":g<=5?"d3":g<=10?"d7":null;
  if(b){S.hardStats[b].n++;if(ok)S.hardStats[b].ok++}
  c.hardAt=null;
}
function addCorrectDay(c){const t=today();if(!c.cdays.includes(t)){c.cdays.push(t);if(c.cdays.length>12)c.cdays.shift()}c.lastCorrect=t}
function checkMastery(id){
  const c=S.cards[id];if(!c)return;REV++;
  if(c.masteredOn&&isWeak(id)){       // Kalıcı → Zayıf: unutulan kalıcı kelime, bağlam ağırlıklı yeniden öğrenmeye alınır
    c.masteredOn=null;c.forgot=(c.forgot||0)+1;c.relearn=true;S.forgotMastered=(S.forgotMastered||0)+1;const d=dayRec();d.fm=(d.fm||0)+1;REV++;return}
  if(!c.masteredOn&&isMasteredId(id)){c.masteredOn=today();c.relearn=false;if(SS)SS.mastered++;dayRec().m++}
}
function schedule(id,r){
  const c=ensure(id),t=today();
  if(c.reps>0&&c.lastRev!=null&&c.lastRev<t){const okR=r==="good"||r==="easy";calibAdd(recallProbability(id,t),okR);retrievalObs(c,okR,t)}
  const x=nextStep(c,r,c.first===t,SS&&SS.again.has(id));
  if(c.hardPending&&c.lastRev!==t){S.hardFollow.n++;if(r==="good"||r==="easy")S.hardFollow.ok++}
  c.hardPending=r==="hard";
  hardTrack(c,r==="good"||r==="easy");if(r==="hard")c.hardAt=t;
  adaptSpacing(c,r);
  if(x.lapse)c.lapses++;
  updateStab(c,r);
  c.step=x.step;c.due=t+personalDue(r,x);c.reps++;c.last=t;
  c.rat.push(r[0]);if(c.rat.length>6)c.rat.shift();
  c.hist.push(r==="again"?0:r==="hard"?.5:1);if(c.hist.length>10)c.hist.shift();
  if(r==="good"||r==="easy")addCorrectDay(c);
  checkMastery(id);
}
function rateLabel(id,r){
  if(r==="again")return"oturumda";
  const c=S.cards[id]||{step:0,first:today()};
  const x=nextStep(c,r,!S.cards[id]||c.first===today(),SS&&SS.again.has(id));
  return personalDue(r,x)+" gün";
}

