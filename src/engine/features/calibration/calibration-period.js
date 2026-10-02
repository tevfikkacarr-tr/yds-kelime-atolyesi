/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= KALİBRASYON DÖNEMİ (ölçüm; algoritmayı değiştirmez) ================= */
function studyDaysSince(start){if(start==null)return 0;let n=0;for(const d in S.days){const x=S.days[d];if(+d>=start&&(x.q||x.n||x.r))n++}return n}
function calDay(){return studyDaysSince(S.calStart)}
function calStatus(){const d=calDay();return d<14?"Early Data":d<30?"Calibration in Progress":"Calibration Ready"}
/* Yeniden hatırlama gözlemi: önceki puana ve aradaki güne göre (1/3/7/14) + doğru cevap hız kovası + leech kurtarma */
function gapBucket(g){return g<=1?"1":g<=4?"3":g<=10?"7":g<=20?"14":null}
function retrievalObs(c,ok,t,quiz){
  const g=t-c.lastRev,b=gapBucket(g),prev={e:"easy",g:"good",h:"hard",a:"again"}[c.rat[c.rat.length-1]];
  if(b&&prev&&prev!=="again"&&!(prev==="hard"&&b==="14")){const k=prev+":"+b;bump(S.ratingGap,k,ok)}
  if(c.rtB&&t>c.rtB.d){bump(S.rtNext,c.rtB.b,ok);c.rtB=null}
  if(c.leechTrack&&t>c.leechTrack.t){const L=c.leechTrack,lg=t-L.t,lb=lg<=2?"d1":lg<=5?"d3":lg<=10?"d7":null;
    if(lb&&!L.seen[lb]){L.seen[lb]=1;S.leechRec[lb].n++;if(ok)S.leechRec[lb].ok++}
    if(!ok){L.fails++;if(L.fails>=2){c.restUntil=t+3;S.leechRest++;c.leechTrack=null;c.exp={}}}   // özel çalışmadan sonra da gelişme yoksa 3 gün dinlenme, sonra farklı bağlam
    else L.fails=0;
    if(lg>10)c.leechTrack=null}
}
/* Anında / gecikmeli aktarım: daha önce görülmemiş bağlam, okuma veya cloze sorusu */
function delayedTransfer(c,it,ok,t,skill){
  if(skill!=="ctx"||it.k==="reverse")return;
  const unseen=it.k==="yds"||it.k==="rdq"?!(S.qstats[it.bank]&&S.qstats[it.bank].n>1):it.sk?!(c.exp&&c.exp[it.sk]!=null&&c.exp[it.sk]<t):true;
  if(!unseen)return;const age=t-c.first;
  if(age<=1){c.trI=c.trI||{c:0,w:0};bump(c,"trI",ok);bump(S,"immediate",ok)}
  else if(age>=3&&age<=7){c.trD=c.trD||{c:0,w:0};bump(c,"trD",ok);bump(S,"delayed",ok)}
}
function transferGap(id){return wordTags(id).has("RecognitionGap")||quadrantOf(id)==="B"}
/* Bellek ve aktarım dört grubu: A yüksek/yüksek · B bellek yüksek/aktarım düşük · C bellek düşük/aktarım yüksek · D düşük/düşük */
function quadrantOf(id){const c=S.cards[id];if(!c)return null;const tf=transferScore(id);if(!tf)return null;const m=masteryScore(id)>=70,tr=tf.score>=70;return m&&tr?"A":m?"B":tr?"C":"D"}
function quadrants(){return memo("quad",()=>{const o={A:0,B:0,C:0,D:0,none:0,B_ids:[]};for(const id in S.cards){if(!BY[id])continue;const q=quadrantOf(id);if(!q)o.none++;else{o[q]++;if(q==="B")o.B_ids.push(id)}}return o})}
function quadSnapshot(t){if(S.quadHist.length&&S.quadHist[S.quadHist.length-1].d===t)return;const q=quadrants();S.quadHist.push({d:t,A:q.A,B:q.B,C:q.C,D:q.D});if(S.quadHist.length>120)S.quadHist.shift()}
/* Recognition / Recall Gap doğrulaması: etiketlenen kelime 14 gün sonra yeniden değerlendirilir */
function directAcc(c){const r=c.rat.slice(-6).map(x=>x==="g"||x==="e"?1:x==="h"?.5:0);const m=c.sk.mean||{c:0,w:0};const n=r.length+m.c+m.w;return n?{a:(r.reduce((a,b)=>a+b,0)+m.c)/n,n}:null}
function trackGaps(t){
  for(const id in S.cards){if(!BY[id])continue;const tags=wordTags(id,t),c=S.cards[id];
    for(const [tag,key] of [["RecognitionGap","RG"],["RecallGap","RC"]]){
      const tr=S.gapTrack[key+":"+id];
      if(!tr&&tags.has(tag)){const da=directAcc(c);S.gapTrack[key+":"+id]={since:t,before:da?da.a:null,n0:da?da.n:0}}
      else if(tr&&!tr.done&&t-tr.since>=14){tr.done=t;tr.resolved=!tags.has(tag);S.gapStats[key].n++;if(tr.resolved)S.gapStats[key].resolved++;
        if(key==="RC"){const da=directAcc(c);if(da&&tr.before!=null&&da.n>=tr.n0+3){S.gapStats.RC.before+=tr.before;S.gapStats.RC.after+=da.a;S.gapStats.RC.m=(S.gapStats.RC.m||0)+1}}}}}
}
/* Leech nedeni (yaklaşık) */
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const tmp=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=tmp}}return d[b.length]}
function leechReason(id){
  const c=S.cards[id],w=BY[id];if(!c)return null;
  const confs=Object.keys(S.conf[id]||{}).concat(Object.keys(S.conf).filter(k=>S.conf[k][id]));
  const spell=confs.find(x=>BY[x]&&x!==id&&w.w.length>=5&&lev(w.w,x)<=2)||W.find(x=>x.id!==id&&S.cards[x.id]&&w.w.length>=6&&x.w.slice(0,5)===w.w.slice(0,5));
  if(spell)return{r:"Spelling similarity",tr:"Yazım benzerliği",d:typeof spell==="string"?spell:spell.w};
  if((c.confErr||0)>=2||confs.some(x=>confusionCount(id,x)>=2))return{r:"Confusion",tr:"Karıştırma",d:confs[0]||""};
  const fam=W.filter(x=>x.id!==id&&S.cards[x.id]&&Math.abs(S.cards[x.id].first-c.first)<=3&&(sameLadder(id,x.id)||(x.g===w.g&&(w.syn.includes(x.w)||x.syn.includes(w.w)))));
  if(fam.length>=3)return{r:"Synonym overload",tr:"Eş anlam yükü",d:fam.slice(0,3).map(x=>x.w).join(", ")};
  const ca=smAcc(c.sk.ctx),ma=directAcc(c);if(ca!=null&&ca<.5&&ma&&ma.a>=.6)return{r:"Weak context transfer",tr:"Bağlama aktarım zayıf",d:""};
  if(c.lapses>=3||(c.forgot||0)>=1)return{r:"Repeated forgetting",tr:"Tekrar tekrar unutma",d:`${c.lapses} unutma`};
  return{r:"Low exposure quality",tr:"Düşük nitelikli tekrar",d:`${c.cdays.length} farklı günde doğru`};
}
/* Karar motoru: öğrenme değeri (iç kullanım) */
function learningValueScore(id,t,p){
  const c=S.cards[id],w=BY[id];if(!c)return 0;p=p??recallProbability(id,t);
  const overdue=Math.min(1,Math.max(0,t-c.due)/7),weak=weakScore(id)/100,gap=transferGap(id)?1:0,lee=wordTags(id).has("Leech")?1:0;
  const recent=(c.lastRev===t?1:0);const sem=(LADBY[id]||[]).length?1:0;
  return 40*(1-p)*(1+overdue)+15*(w.p/100)+15*Math.max(weak,lee*.6)+15*gap+5*sem-25*recent+(c.hardPending?5:0);
}
/* Soru anahtarı (geri bildirim / tekrar eden yanlış seçenek) */
function qKey(it){return it.bank?it.bank:it.k==="clz"?`clz:${it.cz.id}:${it.bi}`:it.k==="trap"?`trap:${it.t.s.slice(0,40)}`:`${it.k}:${it.id||""}:${it.sk||""}`}
/* Brier yorumu */
function brierLabel(){const n=S.brier.n,b=n?S.brier.sum/n:null;if(b==null)return{b,l:"Insufficient Data"};const l=b<.15?"Good":b<.2?"Acceptable":b<.25?"Needs calibration":"Poor calibration";return{b,l:n<100?`${l} (n<100, kesin değil)`:l,n}}
function gapRate(k){const x=S.ratingGap[k];return x?{a:x.c/(x.c+x.w),n:x.c+x.w}:{a:null,n:0}}
function rateOf(x){return x&&x.n?{a:x.ok/x.n,n:x.n}:{a:null,n:0}}
/* REAL USER CALIBRATION */
function realCalibration(){
  const t=today(),sessions=S.sessLog.filter(x=>x.ok),all=S.sessLog.filter(x=>["daily","extra","quick"].includes(x.mode));
  const durs=sessions.map(x=>x.secs).filter(x=>x!=null);
  const tot=S.schedTot,acc=x=>x.n?{a:x.ok/x.n,n:x.n}:{a:null,n:0};
  const tfAgg=k=>{let c=0,w=0;for(const id in S.cards){const x=(S.cards[id].tr||{})[k];if(x){c+=x.c;w+=x.w}}return{a:c+w?c/(c+w):null,n:c+w}};
  return{calDay:calDay(),status:calStatus(),studyDays:studyDaysSince(-1e9),sessions:sessions.length,reviews:calibDashboard().reviews,
    unique:Object.values(S.cards).filter(c=>c.reps>0).length,newWords:Object.values(S.cards).filter(c=>S.calStart!=null&&c.first>=S.calStart).length,
    predicted:S.brier.n?S.calib.reduce((a,b)=>a+b.ps,0)/S.brier.n:null,actual:S.brier.n?S.calib.reduce((a,b)=>a+b.ok,0)/S.brier.n:null,brier:brierLabel(),
    easy:acc(tot.easy),good:acc(tot.good),hard:acc(tot.hard),hard1:rateOf(S.hardStats.d1),hard3:rateOf(S.hardStats.d3),hard7:rateOf(S.hardStats.d7),
    recog:taggedIds("RecognitionGap").length,recall:taggedIds("RecallGap").length,leech:taggedIds("Leech").length,fragile:taggedIds("FragileMastered").length,forgotten:S.forgotMastered||0,
    readT:tfAgg("read"),clzT:tfAgg("clz"),yvT:tfAgg("yv"),delayed:rateOf({n:S.delayed.c+S.delayed.w,ok:S.delayed.c}),immediate:rateOf({n:S.immediate.c+S.immediate.w,ok:S.immediate.c}),
    avgSecs:durs.length?durs.reduce((a,b)=>a+b,0)/durs.length:null,completion:all.length?all.filter(x=>x.ok).length/all.length:null,chars:storageChars(),events:S.ev.length,agg:Object.keys(S.dailyStats).length};
}
/* Önerilen kalibrasyon değişiklikleri: yalnızca yeterli veriyle; otomatik uygulanmaz (onaydan sonra scheduler-v3) */
function recommendedChanges(){
  const out=[],tot=S.schedTot;
  const chk=(k,lo,hi,label)=>{const x=tot[k];if(x.n<40)return;const a=x.ok/x.n;if(a>hi+.03)out.push(`${label} sonrası gerçek hatırlama %${pct(a)} (hedef %${pct(lo)}–${pct(hi)}, n=${x.n}) → ${label} aralığı biraz uzatılabilir.`);else if(a<lo-.03)out.push(`${label} sonrası gerçek hatırlama %${pct(a)} (hedef %${pct(lo)}–${pct(hi)}, n=${x.n}) → ${label} aralığı kısaltılmalı.`)};
  chk("good",.8,.9,"Good");chk("easy",.9,.97,"Easy");chk("hard",.6,.75,"Hard");
  const h3=gapRate("hard:3");if(h3.n>=20&&h3.a<.5)out.push(`Hard 3 gün hatırlama %${pct(h3.a)} (n=${h3.n}) → Hard aralığı kısaltılmalı.`);
  const rb=["<3","3–7","7–15","15–30"].map(b=>({b,...(S.rtNext[b]?{a:S.rtNext[b].c/(S.rtNext[b].c+S.rtNext[b].w),n:S.rtNext[b].c+S.rtNext[b].w}:{a:null,n:0})}));
  const f=rb[0],sl=rb.slice(2).filter(x=>x.n>=20)[0];if(f.n>=20&&sl){if(f.a-sl.a<.05)out.push(`Hızlı (<3 sn) ve yavaş doğru cevapların sonraki hatırlaması benzer (%${pct(f.a)} / %${pct(sl.a)}) → tepki süresinin ustalık etkisi azaltılmalı.`);else out.push(`Tepki süresi sonraki hatırlamayı öngörüyor (%${pct(f.a)} / %${pct(sl.a)}) → mevcut düşük ağırlık korunabilir.`)}
  const G=S.gapStats.RG;if(G.n>=10)out.push(`Recognition Gap: 14 gün sonra %${pct(G.resolved/G.n)} etiketten çıktı (n=${G.n}) → ${G.resolved/G.n>=.5?"bağlam ağırlıklı yöntem etkili":"yöntem yeniden değerlendirilmeli"}.`);
  const RC=S.gapStats.RC;if((RC.m||0)>=8)out.push(`Recall Gap: doğrudan hatırlama %${pct(RC.before/RC.m)} → %${pct(RC.after/RC.m)} (n=${RC.m}).`);
  const m30=S.mastCheck["30"];if(m30&&m30.c+m30.w>=20){const a=m30.c/(m30.c+m30.w);out.push(`Kalıcı kelimelerin 30. gün kontrol başarısı %${pct(a)} (n=${m30.c+m30.w}) → ${a<.8?"Mastered kriteri gevşek olabilir; eşik yeniden değerlendirilmeli":"Mastered kriteri yeterli görünüyor"}.`)}
  const L=S.leechRec.d7;if(L.n>=10)out.push(`Leech yöntemi: özel karttan 7 gün sonra hatırlama %${pct(L.ok/L.n)} (n=${L.n}).`);
  const sg=suggestNewPerDay();if(sg.ready&&sg.rec!==sg.cur)out.push(sg.text);
  const cs=completionStats();if(cs.tip)out.push(cs.tip);
  return out;
}
/* 30 günlük öğrenme raporu */
function report30(){
  const st=S.calStart,days=Object.keys(S.days).filter(d=>+d>=(st??0)).map(d=>S.days[d]);
  const sum=k=>days.reduce((a,x)=>a+(x[k]||0),0),skc=k=>days.reduce((a,x)=>{const v=x.sk&&x.sk[k];return v?{c:a.c+v.c,w:a.w+v.w}:a},{c:0,w:0});
  const rd=days.reduce((a,x)=>x.rd?{c:a.c+x.rd.c,w:a.w+x.rd.w}:a,{c:0,w:0}),cz=days.reduce((a,x)=>x.cz?{c:a.c+x.cz.c,w:a.w+x.cz.w}:a,{c:0,w:0});
  const gs=Object.keys(GROUPS).map(g=>({g,...groupMastery(g)})).filter(x=>x.seen>=3).sort((a,b)=>b.score-a.score);
  const tfs=Object.keys(S.cards).map(id=>transferScore(id)).filter(Boolean);
  const secs=S.sessLog.filter(x=>x.d>=(st??0)&&x.secs).reduce((a,x)=>a+x.secs,0);
  const rc=realCalibration();
  return{studyDays:rc.calDay,studyMin:Math.round(secs/60),introduced:sum("n"),mastered:sum("m"),forgotten:days.reduce((a,x)=>a+(x.fm||0),0),reviews:rc.reviews,
    memory:accOf(S.err.mean),transfer:tfs.length?tfs.reduce((a,x)=>a+x.score,0)/tfs.length/100:null,delayed:rc.delayed,
    best:gs.slice(0,3),weakest:gs.slice(-3).reverse(),recog:rc.recog,recall:rc.recall,leech:rc.leech,easy:rc.easy,good:rc.good,hard:rc.hard,
    spacing:S.spacing,brier:rc.brier,reading:accOf(rd),cloze:accOf(cz),mini:miniTrend(),newRec:suggestNewPerDay(),lenRec:completionStats().tip,changes:recommendedChanges()};
}
/* Performans kaydı: 1 / 14 / 30 / 60 / 90. çalışma günü */
function perfMilestone(renderMs){const d=calDay();for(const m of [1,14,30,60,90])if(d>=m&&!S.perfLog.some(x=>x.m===m)){S.perfLog.push({m,d:today(),chars:storageChars(),events:S.ev.length,agg:Object.keys(S.dailyStats).length,renderMs:Math.round(renderMs)})}}
